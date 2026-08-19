import { useState, useEffect } from "react";
import { Eye, EyeOff, Scale, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface JudgeAuthProps {
  onAuthSuccess: (judgeId: string, judgeData: any) => void;
}

export default function JudgeAuth({ onAuthSuccess }: JudgeAuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    specialization: [] as string[],
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const specializationOptions = [
    { value: 'payment_disputes', label: 'Payment Disputes' },
    { value: 'booking_conflicts', label: 'Booking Conflicts' },
    { value: 'content_issues', label: 'Content Issues' },
    { value: 'technical_issues', label: 'Technical Issues' },
    { value: 'general', label: 'General Disputes' }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First authenticate with main Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;

      // Check if user is a judge
      const { data: judgeData, error: judgeError } = await supabase
        .from('judges')
        .select('*')
        .eq('email', formData.email)
        .single();

      if (judgeError || !judgeData) {
        await supabase.auth.signOut();
        throw new Error('Invalid judge credentials or account not approved');
      }

      if (judgeData.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error(`Judge account is ${judgeData.status}. Please contact administration.`);
      }

      // Update last login
      await supabase
        .from('judges')
        .update({ last_login: new Date().toISOString() })
        .eq('id', judgeData.id);

      // Create judge session
      const sessionToken = crypto.randomUUID();
      await supabase
        .from('judge_sessions')
        .insert({
          judge_id: judgeData.id,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
          ip_address: 'browser', // Would get actual IP in production
          user_agent: navigator.userAgent
        });

      // Store session data
      localStorage.setItem('judge_session_token', sessionToken);
      localStorage.setItem('judge_id', judgeData.id);

      onAuthSuccess(judgeData.id, judgeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (formData.specialization.length === 0) {
        throw new Error('Please select at least one specialization');
      }

      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            user_type: 'judge'
          }
        }
      });

      if (authError) throw authError;

      // Create judge profile (pending approval)
      const { error: judgeError } = await supabase
        .from('judges')
        .insert({
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          specialization: formData.specialization,
          status: 'pending', // Requires approval
          rank: 'junior'
        });

      if (judgeError) {
        // If judge creation fails, clean up auth account
        await supabase.auth.signOut();
        throw judgeError;
      }

      setMode('login');
      setError('');
      alert('Registration successful! Your account is pending approval. You will be notified once approved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specialization: prev.specialization.includes(spec)
        ? prev.specialization.filter(s => s !== spec)
        : [...prev.specialization, spec]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-[#0b7e84] p-3 rounded-full">
              <Scale className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">
            Judges Portal
          </h2>
          <p className="mt-2 text-gray-300">
            {mode === 'login' ? 'Sign in to access the court room system' : 'Apply to become a dispute resolution judge'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-800 shadow-xl rounded-lg p-8 border border-gray-700">
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]"
                placeholder="judge@example.com"
              />
            </div>

            {/* Full Name (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]"
                  placeholder="Judge John Smith"
                />
              </div>
            )}

            {/* Phone (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84] focus:ring-1 focus:ring-[#0b7e84]"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            {/* Specializations (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Areas of Specialization
                </label>
                <div className="space-y-2">
                  {specializationOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.specialization.includes(option.value)}
                        onChange={() => toggleSpecialization(option.value)}
                        className="w-4 h-4 text-[#0b7e84] bg-gray-700 border-gray-600 rounded focus:ring-[#0b7e84] focus:ring-2"
                      />
                      <span className="text-sm text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'login' ? <Shield size={20} /> : <UserCheck size={20} />}
                  <span>{mode === 'login' ? 'Sign In' : 'Apply for Judge Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-[#0b7e84] hover:text-[#096a70] font-medium"
            >
              {mode === 'login' 
                ? "Need to apply for a judge account? Register here"
                : "Already have an account? Sign in here"
              }
            </button>
          </div>

          {/* Help */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              For technical support or account issues, contact{' '}
              <a href="mailto:judges@coursevia.com" className="text-[#0b7e84] hover:underline">
                judges@coursevia.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
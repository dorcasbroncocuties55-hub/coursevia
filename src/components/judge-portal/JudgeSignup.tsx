import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Lock, Mail, User, Phone, MapPin, ArrowLeft } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

const JudgeSignup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    country: '',
    state: '',
    specialization: '',
    barNumber: '',
    yearsExperience: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      throw new Error('Please fill in all required fields');
    }

    if (formData.password !== formData.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (formData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    if (formData.yearsExperience && (isNaN(Number(formData.yearsExperience)) || Number(formData.yearsExperience) < 0)) {
      throw new Error('Years of experience must be a valid number');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      validateForm();

      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Create judge profile (status will be 'pending' until approved)
      // Note: If you've run JUDGES_TABLE_EXTENDED.sql, uncomment the additional fields below
      const { error: judgeError } = await supabase
        .from('judges')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phoneNumber || null,
          specialization: formData.specialization ? [formData.specialization] : [],
          rank: 'junior',
          status: 'pending',
          // Uncomment these if you ran JUDGES_TABLE_EXTENDED.sql migration:
          // country: formData.country || null,
          // state: formData.state || null,
          // bar_number: formData.barNumber || null,
          // years_experience: formData.yearsExperience ? Number(formData.yearsExperience) : null,
          // cases_handled: 0,
          // success_rate: 0,
          // avg_resolution_time: 0
        });

      if (judgeError) {
        // If judge profile creation fails, we should clean up the auth account
        await supabase.auth.signOut();
        throw judgeError;
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      toast.info('Your judge application is pending approval from administrators.');

      // Redirect to login page
      navigate('/judge-portal/login');

    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-3 sm:p-4 md:p-6 py-8">
      <Card className="w-full max-w-2xl shadow-2xl my-4">
        <CardHeader className="space-y-2 sm:space-y-3 px-4 sm:px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/judge-portal/login')}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Back to Login</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="bg-purple-100 p-2.5 sm:p-3 rounded-full">
              <Gavel className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-center text-gray-900">
            Apply for Judge Portal Access
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base text-gray-600">
            Create your judicial account - subject to administrative approval
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6">
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-600 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="judge@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Hon. John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className="pl-10 h-11 text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="country"
                    type="text"
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="pl-10 h-11 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">State/Province</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="California"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specialization" className="text-sm font-medium text-gray-700">Legal Specialization</Label>
                <Select onValueChange={(value) => handleInputChange('specialization', value)}>
                  <SelectTrigger className="h-11 text-base">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil Law</SelectItem>
                    <SelectItem value="criminal">Criminal Law</SelectItem>
                    <SelectItem value="family">Family Law</SelectItem>
                    <SelectItem value="corporate">Corporate Law</SelectItem>
                    <SelectItem value="constitutional">Constitutional Law</SelectItem>
                    <SelectItem value="administrative">Administrative Law</SelectItem>
                    <SelectItem value="international">International Law</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="barNumber" className="text-sm font-medium text-gray-700">Bar Registration Number</Label>
                <Input
                  id="barNumber"
                  type="text"
                  placeholder="BAR123456"
                  value={formData.barNumber}
                  onChange={(e) => handleInputChange('barNumber', e.target.value)}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="yearsExperience" className="text-sm font-medium text-gray-700">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  placeholder="10"
                  min="0"
                  value={formData.yearsExperience}
                  onChange={(e) => handleInputChange('yearsExperience', e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium h-12 mt-6 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Submit Application'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500 space-y-1">
            <p><span className="text-red-500">*</span> Required fields</p>
            <p className="mt-2">Applications are reviewed by CourseVia administrators</p>
            <p>You will receive email notification once approved</p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              🔒 All information is securely encrypted and verified
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgeSignup;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gavel, Lock, Mail, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

const JudgeLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Update greeting based on time
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      setCurrentTime(timeStr);

      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
      } else if (hour >= 12 && hour < 17) {
        setGreeting('Good Afternoon');
      } else if (hour >= 17 && hour < 21) {
        setGreeting('Good Evening');
      } else {
        setGreeting('Good Night');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      // Verify this user is a judge
      const { data: judgeData, error: judgeError } = await supabase
        .from('judges')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (judgeError || !judgeData) {
        // Sign out if not a judge
        await supabase.auth.signOut();
        throw new Error('Access denied. Judge account not found or inactive.');
      }

      toast.success(`Welcome back, ${judgeData.full_name}!`);

      // Redirect to judge dashboard
      navigate('/judge-portal/dashboard');

    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-3 px-6 pt-8 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Gavel className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              Judge Portal Login
            </CardTitle>
            <p className="text-center text-sm text-gray-600">
              Access the CourseVia Judge Portal
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-8">
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertDescription className="text-red-600 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="judge@coursevia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 text-base"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium h-11 mt-6 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In to Portal'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => navigate('/judge-portal/signup')}
                className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors"
              >
                Apply for Judge Portal Access
              </Button>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
              <p>Authorized judicial personnel only</p>
              <p>Need help? Contact IT Support</p>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                🔒 Secure judicial access portal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Inspiring Content */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-lg text-white space-y-8">
          {/* Time-based greeting */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-purple-200">
              <Clock className="h-6 w-6" />
              <span className="text-lg font-light">{currentTime}</span>
            </div>
            <h2 className="text-5xl font-bold leading-tight">
              {greeting}
            </h2>
            <p className="text-2xl font-light text-purple-100">
              Welcome back to your space
            </p>
          </div>

          {/* Divider */}
          <div className="w-24 h-1 bg-purple-400 rounded-full"></div>

          {/* Inspiring messages */}
          <div className="space-y-4">
            <p className="text-xl font-medium text-white">
              Make sure you try and make a difference
            </p>

            <div className="space-y-3 text-purple-100">
              <p className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span>Every decision you make impacts lives</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span>Justice is not just a concept, it's your action</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span>Your wisdom shapes fair outcomes</span>
              </p>
            </div>
          </div>

          {/* Quote */}
          <div className="border-l-4 border-purple-400 pl-6 py-2">
            <p className="text-lg italic text-purple-100">
              "The first duty of society is justice."
            </p>
            <p className="text-sm text-purple-300 mt-2">— Alexander Hamilton</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeLogin;

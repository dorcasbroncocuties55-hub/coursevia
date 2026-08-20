import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  Users, 
  Briefcase, 
  Heart, 
  PenTool, 
  Shield,
  ArrowRight,
  Sparkles,
  Target,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const roleConfig = {
  learner: {
    icon: GraduationCap,
    title: "Welcome to Your Learning Journey!",
    subtitle: "Discover courses, connect with coaches, and achieve your goals",
    color: "bg-blue-500",
    features: [
      { icon: Target, title: "Personalized Learning", desc: "Courses tailored to your interests" },
      { icon: Users, title: "Expert Coaches", desc: "1-on-1 sessions with professionals" },
      { icon: Calendar, title: "Flexible Schedule", desc: "Learn at your own pace" }
    ],
    cta: "Start Learning",
    redirectTo: "/dashboard"
  },
  coach: {
    icon: Users,
    title: "Welcome to Your Coaching Hub!",
    subtitle: "Manage clients, schedule sessions, and grow your practice",
    color: "bg-green-500",
    features: [
      { icon: Calendar, title: "Session Management", desc: "Easy booking and scheduling" },
      { icon: Target, title: "Client Progress", desc: "Track your clients' journey" },
      { icon: Briefcase, title: "Earnings Dashboard", desc: "Monitor your income" }
    ],
    cta: "Start Coaching",
    redirectTo: "/coach-directory"
  },
  creator: {
    icon: PenTool,
    title: "Welcome to Your Creator Studio!",
    subtitle: "Create courses, share knowledge, and monetize your expertise",
    color: "bg-purple-500",
    features: [
      { icon: PenTool, title: "Course Builder", desc: "Create engaging video courses" },
      { icon: Target, title: "Analytics", desc: "Track student engagement" },
      { icon: Briefcase, title: "Revenue Tracking", desc: "Monitor your earnings" }
    ],
    cta: "Start Creating",
    redirectTo: "/dashboard"
  },
  therapist: {
    icon: Heart,
    title: "Welcome to Your Therapy Practice!",
    subtitle: "Manage clients, provide support, and make a difference",
    color: "bg-pink-500",
    features: [
      { icon: Heart, title: "Client Care", desc: "Secure and confidential sessions" },
      { icon: Calendar, title: "Appointment System", desc: "Streamlined scheduling" },
      { icon: Shield, title: "Privacy First", desc: "HIPAA-compliant platform" }
    ],
    cta: "Begin Practice",
    redirectTo: "/therapist-directory"
  },
  admin: {
    icon: Shield,
    title: "Welcome to Admin Control Center!",
    subtitle: "Manage the platform, users, and ensure quality service",
    color: "bg-red-500",
    features: [
      { icon: Shield, title: "User Management", desc: "Oversee all platform users" },
      { icon: Target, title: "Platform Analytics", desc: "Monitor system performance" },
      { icon: Users, title: "Support Center", desc: "Resolve user issues" }
    ],
    cta: "Access Admin Panel",
    redirectTo: "/dashboard"
  }
};

const WelcomePage = () => {
  const [userRole, setUserRole] = useState<'learner' | 'coach' | 'creator' | 'therapist' | 'admin' | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        setUserRole(profile.role);
        
        // If onboarding is already completed, redirect to appropriate page
        if (profile.onboarding_completed) {
          const config = roleConfig[profile.role as keyof typeof roleConfig];
          navigate(config?.redirectTo || '/dashboard');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update onboarding_completed status
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        toast.success('Welcome to CourseVia! Your account is ready.');
        
        // Redirect based on role
        const config = roleConfig[userRole as keyof typeof roleConfig];
        navigate(config?.redirectTo || '/dashboard');
      }
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Setting up your welcome page...</p>
        </div>
      </div>
    );
  }

  if (!userRole || !roleConfig[userRole]) {
    navigate('/auth');
    return null;
  }

  const config = roleConfig[userRole];
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Header */}
          <div className="mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`inline-flex p-6 rounded-full ${config.color} mb-6`}
            >
              <IconComponent className="h-16 w-16 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              {config.title}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              {config.subtitle}
            </motion.p>
          </div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            {config.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center pb-2">
                      <div className={`inline-flex p-3 rounded-full ${config.color} bg-opacity-10 mb-3`}>
                        <FeatureIcon className={`h-6 w-6 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        {feature.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl p-8 shadow-lg border mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Welcome, {userProfile?.full_name || 'User'}!
              </h2>
              <Sparkles className="h-6 w-6 text-yellow-500 ml-2" />
            </div>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Your {userRole} account is ready to use. Access all the tools you need to succeed on the CourseVia platform.
            </p>
            
            <Button
              onClick={handleComplete}
              disabled={isCompleting}
              size="lg"
              className={`${config.color} hover:opacity-90 text-white px-8 py-3 text-lg`}
            >
              {isCompleting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.div>
                  Setting up...
                </>
              ) : (
                <>
                  {config.cta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-gray-500"
          >
            Need help getting started? Visit our support center or contact our team.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomePage;
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Portal Apps
import JudgePortalApp from '../judge-portal/JudgePortalApp';
import CoachPortal from './coach/CoachPortal';
import LearnerPortal from './learner/LearnerPortal';
import TherapistPortal from './therapist/TherapistPortal';
import CreatorPortal from './creator/CreatorPortal';
import AdminPortal from './admin/AdminPortal';
import WelcomePage from './WelcomePage';

interface UserRole {
  role: 'learner' | 'coach' | 'creator' | 'therapist' | 'admin' | 'judge';
  onboarding_completed: boolean;
}

const PortalRouter = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserRole();
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      // Check if user is a judge
      const { data: judgeData } = await supabase
        .from('judges')
        .select('id, status')
        .eq('email', session.user.email)
        .eq('status', 'active')
        .single();

      if (judgeData) {
        setUserRole({ role: 'judge', onboarding_completed: true });
        setIsLoading(false);
        return;
      }

      // Check regular user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (profileData?.role) {
        setUserRole({
          role: profileData.role,
          onboarding_completed: profileData.onboarding_completed || false
        });
      } else {
        // No role assigned yet
        setUserRole({ role: 'learner', onboarding_completed: false });
      }

    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole({ role: 'learner', onboarding_completed: false });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Show welcome page if onboarding not completed
  if (userRole && !userRole.onboarding_completed) {
    return <WelcomePage userRole={userRole.role} onComplete={() => {
      setUserRole(prev => prev ? { ...prev, onboarding_completed: true } : null);
    }} />;
  }

  // Route to appropriate portal based on user role
  return (
    <Routes>
      {userRole?.role === 'judge' && (
        <Route path="/judge-portal/*" element={<JudgePortalApp />} />
      )}
      {userRole?.role === 'coach' && (
        <Route path="/coach-portal/*" element={<CoachPortal />} />
      )}
      {userRole?.role === 'learner' && (
        <Route path="/learner-portal/*" element={<LearnerPortal />} />
      )}
      {userRole?.role === 'therapist' && (
        <Route path="/therapist-portal/*" element={<TherapistPortal />} />
      )}
      {userRole?.role === 'creator' && (
        <Route path="/creator-portal/*" element={<CreatorPortal />} />
      )}
      {userRole?.role === 'admin' && (
        <Route path="/admin-portal/*" element={<AdminPortal />} />
      )}
      
      {/* Default redirects based on role */}
      <Route path="*" element={
        <Navigate 
          to={`/${userRole?.role}-portal/dashboard`} 
          replace 
        />
      } />
    </Routes>
  );
};

export default PortalRouter;
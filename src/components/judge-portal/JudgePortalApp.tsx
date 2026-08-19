import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import JudgeLogin from './JudgeLogin';
import JudgeDashboard from './JudgeDashboard';
import JudgeRankings from './JudgeRankings';
import JudgeProfile from './JudgeProfile';
import JudgeCases from './JudgeCases';
import { Gavel } from 'lucide-react';

const JudgePortalApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isJudge, setIsJudge] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        verifyJudgeStatus(session.user.email);
      } else {
        setIsAuthenticated(false);
        setIsJudge(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user?.email) {
      await verifyJudgeStatus(session.user.email);
    } else {
      setIsAuthenticated(false);
      setIsJudge(false);
    }
  };

  const verifyJudgeStatus = async (email: string | undefined) => {
    if (!email) {
      setIsAuthenticated(false);
      setIsJudge(false);
      return;
    }

    try {
      const { data: judgeData, error } = await supabase
        .from('judges')
        .select('id, status')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      setIsAuthenticated(true);
      setIsJudge(!!judgeData && !error);
    } catch (error) {
      setIsAuthenticated(true);
      setIsJudge(false);
    }
  };

  // Show loading while checking auth
  if (isAuthenticated === null || isJudge === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Gavel className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-bounce" />
          <p className="text-gray-600">Verifying judge credentials...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authenticated or not a judge
  if (!isAuthenticated || !isJudge) {
    return (
      <Routes>
        <Route path="/login" element={<JudgeLogin />} />
        <Route path="*" element={<Navigate to="/judge-portal/login" replace />} />
      </Routes>
    );
  }

  // Show judge portal if authenticated and is a judge
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/judge-portal/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/judge-portal/dashboard" replace />} />
      <Route path="/dashboard" element={<JudgeDashboard />} />
      <Route path="/rankings" element={<JudgeRankings />} />
      <Route path="/profile" element={<JudgeProfile />} />
      <Route path="/cases" element={<JudgeCases />} />
      <Route path="*" element={<Navigate to="/judge-portal/dashboard" replace />} />
    </Routes>
  );
};

export default JudgePortalApp;
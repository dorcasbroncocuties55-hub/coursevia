import { useState, useEffect } from "react";
import { Scale, LogOut, Settings, Bell, User } from "lucide-react";
import JudgeAuth from "./JudgeAuth";
import JudgeDashboard from "./JudgeDashboard";
import JudgeAnalytics from "./JudgeAnalytics";
import JudgeCaseManagement from "./JudgeCaseManagement";
import JudgeCollaboration from "./JudgeCollaboration";
import { supabase } from "@/integrations/supabase/client";

interface JudgeData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  specialization: string[];
  status: string;
  rank: string;
  hire_date: string;
  last_login?: string;
}

export default function JudgePortalApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [judgeData, setJudgeData] = useState<JudgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    // Check for existing judge session
    const checkExistingSession = async () => {
      const sessionToken = localStorage.getItem('judge_session_token');
      const judgeId = localStorage.getItem('judge_id');

      if (!sessionToken || !judgeId) {
        setLoading(false);
        return;
      }

      try {
        // Validate session token
        const { data: session, error: sessionError } = await supabase
          .from('judge_sessions')
          .select('*')
          .eq('session_token', sessionToken)
          .eq('judge_id', judgeId)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (sessionError || !session) {
          localStorage.removeItem('judge_session_token');
          localStorage.removeItem('judge_id');
          setLoading(false);
          return;
        }

        // Get judge data
        const { data: judge, error: judgeError } = await supabase
          .from('judges')
          .select('*')
          .eq('id', judgeId)
          .single();

        if (judgeError || !judge || judge.status !== 'active') {
          localStorage.removeItem('judge_session_token');
          localStorage.removeItem('judge_id');
          setLoading(false);
          return;
        }

        setJudgeData(judge);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Session validation error:', error);
        localStorage.removeItem('judge_session_token');
        localStorage.removeItem('judge_id');
      } finally {
        setLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const handleAuthSuccess = (judgeId: string, judge: JudgeData) => {
    setJudgeData(judge);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const sessionToken = localStorage.getItem('judge_session_token');

    if (sessionToken) {
      // Invalidate session in database
      await supabase
        .from('judge_sessions')
        .delete()
        .eq('session_token', sessionToken);
    }

    // Clear local storage
    localStorage.removeItem('judge_session_token');
    localStorage.removeItem('judge_id');

    // Sign out from Supabase auth
    await supabase.auth.signOut();

    setIsAuthenticated(false);
    setJudgeData(null);
    setCurrentView('dashboard');
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'chief': return 'text-yellow-400';
      case 'senior': return 'text-blue-400';
      case 'junior': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Judge Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <JudgeAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-[#0b7e84] p-2 rounded-lg">
              <Scale className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Coursevia Judges Portal</h1>
              <p className="text-sm text-gray-400">Dispute Resolution System</p>
            </div>
          </div>

          {/* Judge Info and Actions */}
          <div className="flex items-center space-x-6">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white transition">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* Judge Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{judgeData?.full_name}</p>
                <p className={`text-xs ${getRankColor(judgeData?.rank || '')} capitalize`}>
                  {judgeData?.rank} Judge
                </p>
              </div>
              <div className="bg-gray-700 p-2 rounded-full">
                <User size={20} className="text-gray-300" />
              </div>
            </div>

            {/* Settings */}
            <button
              onClick={() => setCurrentView('settings')}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              <Settings size={20} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <nav className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
              { id: 'cases', label: 'My Cases', icon: '⚖️' },
              { id: 'all-cases', label: 'All Cases', icon: '📋' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'collaboration', label: 'Judge Chat', icon: '💬' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition ${currentView === tab.id
                  ? 'border-[#0b7e84] text-[#0b7e84]'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {currentView === 'dashboard' && (
          <JudgeDashboard judgeData={judgeData} />
        )}

        {currentView === 'cases' && (
          <JudgeCaseManagement judgeId={judgeData?.id || ''} judgeRank={judgeData?.rank || 'junior'} />
        )}

        {currentView === 'all-cases' && (
          <JudgeCaseManagement judgeId={judgeData?.id || ''} judgeRank={judgeData?.rank || 'junior'} />
        )}

        {currentView === 'analytics' && (
          <JudgeAnalytics judgeId={judgeData?.id || ''} judgeRank={judgeData?.rank || 'junior'} />
        )}

        {currentView === 'collaboration' && (
          <JudgeCollaboration judgeId={judgeData?.id || ''} judgeData={judgeData || { id: '', full_name: '', rank: 'junior' }} />
        )}

        {currentView === 'settings' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>

              <div className="bg-gray-800 rounded-lg p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={judgeData?.full_name || ''}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={judgeData?.email || ''}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Rank
                  </label>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm ${getRankColor(judgeData?.rank || '')} bg-gray-700 capitalize`}>
                    {judgeData?.rank} Judge
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Specializations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {judgeData?.specialization.map((spec, index) => (
                      <span key={index} className="px-3 py-1 bg-[#0b7e84] text-white rounded-full text-sm">
                        {spec.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400">
                    To modify account settings, please contact the system administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
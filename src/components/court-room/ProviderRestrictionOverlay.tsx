import { useState, useEffect } from "react";

interface ProviderRestrictionOverlayProps {
  caseId: string;
}

export default function ProviderRestrictionOverlay({ caseId }: ProviderRestrictionOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Access Restricted</h2>
        <p className="text-gray-700 mb-4">
          Your access to this case is currently restricted. Please contact support for assistance.
        </p>
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
import { AlertTriangle, Clock, Calendar, MessageCircle, FileText, Shield } from "lucide-react";
import { useProviderAccessGuard } from "@/middleware/providerRestrictions";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  providerId: string;
  children: React.ReactNode;
}

export default function ProviderRestrictionOverlay({ providerId, children }: Props) {
  const { accessStatus, loading, refreshAccess } = useProviderAccessGuard(providerId);
  const [courtCaseId, setCourtCaseId] = useState<string | null>(null);
  const [nextMercyTime, setNextMercyTime] = useState<string | null>(null);

  useEffect(() => {
    // Get court case ID for restricted provider
    const getCaseId = async () => {
      if (accessStatus?.isRestricted && accessStatus.restrictions.length > 0) {
        setCourtCaseId(accessStatus.restrictions[0].case_id);
      }
    };

    getCaseId();
  }, [accessStatus]);

  useEffect(() => {
    // Get next mercy window time
    const getNextMercyWindow = async () => {
      if (!accessStatus?.isRestricted) return;

      const now = new Date();
      const { data: nextBooking } = await supabase
        .from('bookings')
        .select('scheduled_at, duration')
        .eq('provider_id', providerId)
        .eq('status', 'confirmed')
        .gt('scheduled_at', now.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single();

      if (nextBooking) {
        const bookingStart = new Date(nextBooking.scheduled_at);
        const mercyStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);
        setNextMercyTime(mercyStart.toISOString());
      }
    };

    getNextMercyWindow();
  }, [accessStatus, providerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#0b7e84]"></div>
      </div>
    );
  }

  // Full access - show normal dashboard
  if (!accessStatus?.isRestricted) {
    return <>{children}</>;
  }

  // Mercy window access - show banner with children
  if (accessStatus.accessLevel === 'mercy') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mercy Window Banner */}
        <div className="bg-amber-100 border-b-4 border-amber-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-amber-600" size={24} />
              <div>
                <h3 className="font-bold text-amber-800">
                  ⚠️ TEMPORARY ACCESS: PORTAL UNLOCKED FOR ACTIVE STUDENT SESSION
                </h3>
                <p className="text-sm text-amber-700">
                  Your dashboard access is temporarily restored for the active session.
                  Access expires in <strong>{accessStatus.mercyWindow.timeRemaining} minutes</strong>.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.href = `/court-room/${courtCaseId}`}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition"
              >
                View Court Case
              </button>
            </div>
          </div>
        </div>

        {/* Restricted Features Notice */}
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <p className="text-sm text-red-700">
            <strong>Restricted Actions:</strong> Wallet access, profile editing, and messaging the disputing user are disabled during dispute resolution.
          </p>
        </div>

        {/* Normal dashboard content with restrictions */}
        <div className="relative">
          {children}
        </div>
      </div>
    );
  }

  // Full lockout - show court room interface only
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Dark Modal Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>

      {/* Court Room Interface */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="text-red-400" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white">Court Room - Dispute Resolution</h1>
                <p className="text-gray-300">Dashboard access restricted due to active dispute case</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Case ID</p>
              <p className="font-mono text-white">{courtCaseId || 'Loading...'}</p>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Case Info */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
            <div className="space-y-6">
              {/* Restriction Status */}
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertTriangle className="text-red-400" size={20} />
                  <h3 className="font-semibold text-red-200">Access Restricted</h3>
                </div>
                <p className="text-sm text-red-300 mb-3">
                  {accessStatus.message}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Restrictions:</span>
                    <span className="text-red-300">{accessStatus.restrictions.length} active</span>
                  </div>
                  {accessStatus.restrictions.map((restriction, index) => (
                    <div key={index} className="text-xs text-gray-400">
                      • {restriction.restriction_type.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Access Window */}
              {nextMercyTime && (
                <div className="bg-amber-900 border border-amber-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock className="text-amber-400" size={20} />
                    <h3 className="font-semibold text-amber-200">Next Access Window</h3>
                  </div>
                  <p className="text-sm text-amber-300">
                    Temporary access will be restored 30 minutes before your next scheduled session.
                  </p>
                  <div className="mt-2 text-xs text-amber-400">
                    {new Date(nextMercyTime).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Available Actions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-white">Available Actions</h3>

                <button
                  onClick={() => window.location.href = `/court-room/${courtCaseId}`}
                  className="w-full flex items-center space-x-3 bg-[#0b7e84] hover:bg-[#096a70] text-white px-4 py-3 rounded-lg transition"
                >
                  <MessageCircle size={20} />
                  <span>Open Court Room Chat</span>
                </button>

                <button
                  onClick={() => window.location.href = `/court-room/${courtCaseId}?tab=evidence`}
                  className="w-full flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition"
                >
                  <FileText size={20} />
                  <span>Upload Evidence</span>
                </button>

                <button
                  onClick={refreshAccess}
                  className="w-full flex items-center space-x-3 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition"
                >
                  <Clock size={20} />
                  <span>Check Access Status</span>
                </button>
              </div>

              {/* Case Timeline */}
              <div>
                <h3 className="font-semibold text-white mb-3">Dispute Timeline</h3>
                <div className="space-y-2 text-sm">
                  {accessStatus.restrictions.map((restriction, index) => (
                    <div key={index} className="flex justify-between text-gray-400">
                      <span>Case opened:</span>
                      <span>{new Date(restriction.activated_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-gray-400">
                    <span>Status:</span>
                    <span className="text-yellow-400">Under Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Court Room Area */}
          <div className="flex-1 bg-gray-700 p-6">
            {courtCaseId ? (
              <div className="bg-gray-800 rounded-lg h-full p-6">
                <div className="text-center py-12">
                  <Shield className="mx-auto text-gray-400 mb-4" size={64} />
                  <h2 className="text-2xl font-bold text-white mb-4">Court Room Access</h2>
                  <p className="text-gray-300 mb-6 max-w-md mx-auto">
                    Your dispute case is being reviewed. Click below to access the court room
                    where you can communicate with the judge and submit evidence.
                  </p>
                  <button
                    onClick={() => window.location.href = `/court-room/${courtCaseId}`}
                    className="bg-[#0b7e84] hover:bg-[#096a70] text-white px-8 py-4 rounded-lg text-lg font-semibold transition"
                  >
                    Enter Court Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-300">Loading case information...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              <p>Coursevia Dispute Resolution System</p>
            </div>
            <div className="flex space-x-4">
              <span>Need help? Contact support</span>
              <span>•</span>
              <span>Case #{courtCaseId?.slice(-8) || 'Loading...'}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
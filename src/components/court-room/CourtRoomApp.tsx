// Main Court Room Application - Integrates all dispute resolution components
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import CourtRoomInterface from './CourtRoomInterface';
import ProviderRestrictionOverlay from './ProviderRestrictionOverlay';
import EvidenceUpload from './EvidenceUpload';
import EvidenceGallery from './EvidenceGallery';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Scale,
  MessageSquare,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Gavel
} from 'lucide-react';

interface CourtCase {
  id: string;
  case_number: string;
  dispute_type: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  disputed_amount: number;
  created_at: string;
  learner_id: string;
  provider_id: string;
  assigned_judge_id: string;
  case_participants: Array<{
    participant_id: string;
    participant_type: 'learner' | 'provider';
    profiles: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
  judges?: {
    full_name: string;
    specialization: string[];
  };
}

export const CourtRoomApp: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courtCase, setCourtCase] = useState<CourtCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [userRole, setUserRole] = useState<'learner' | 'provider' | 'judge' | null>(null);
  const [accessLevel, setAccessLevel] = useState<'full' | 'restricted' | 'mercy' | 'none'>('none');

  // Load court case data and determine user access
  useEffect(() => {
    if (!caseId || !user) return;
    loadCourtCase();
  }, [caseId, user]);

  const loadCourtCase = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch court case with all related data
      const { data: caseData, error: caseError } = await supabase
        .from('court_cases')
        .select(`
          *,
          case_participants (
            participant_id,
            participant_type,
            profiles (
              full_name,
              avatar_url
            )
          ),
          judges (
            full_name,
            specialization
          )
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;
      if (!caseData) throw new Error('Case not found');

      setCourtCase(caseData);

      // Determine user role and access level
      await determineUserAccess(caseData);

    } catch (err) {
      console.error('Error loading court case:', err);
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  const determineUserAccess = async (caseData: CourtCase) => {
    // Check if user is the judge
    if (caseData.assigned_judge_id === user?.id) {
      setUserRole('judge');
      setAccessLevel('full');
      return;
    }

    // Check if user is a participant
    const participant = caseData.case_participants.find(p => p.participant_id === user?.id);
    if (!participant) {
      setAccessLevel('none');
      return;
    }

    setUserRole(participant.participant_type);

    // For providers, check restriction status
    if (participant.participant_type === 'provider') {
      try {
        const response = await fetch(`/api/court/provider/restrictions/${user?.id}`, {
          headers: { 'x-user-id': user?.id || '' }
        });
        const data = await response.json();

        if (data.success) {
          if (!data.isRestricted) {
            setAccessLevel('full');
          } else if (data.mercyWindow.hasAccess) {
            setAccessLevel('mercy');
          } else {
            setAccessLevel('restricted');
          }
        }
      } catch (err) {
        console.error('Error checking provider restrictions:', err);
        setAccessLevel('restricted');
      }
    } else {
      // Learners have full access
      setAccessLevel('full');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAccessDenied = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to view this court case.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!courtCase || accessLevel === 'none') {
    return renderAccessDenied();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Provider Restriction Overlay */}
      {userRole === 'provider' && accessLevel === 'restricted' && (
        <ProviderRestrictionOverlay caseId={caseId!} />
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Scale className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Court Room - Case {courtCase.case_number}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <Badge className={getStatusColor(courtCase.status)}>
                    {courtCase.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getPriorityColor(courtCase.priority_level)}>
                    {courtCase.priority_level.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    ${courtCase.disputed_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {userRole && (
                <Badge variant="outline">
                  {userRole === 'judge' ? (
                    <><Gavel className="h-3 w-3 mr-1" />Judge</>
                  ) : (
                    <><User className="h-3 w-3 mr-1" />{userRole}</>
                  )}
                </Badge>
              )}
              {accessLevel === 'mercy' && (
                <Badge className="bg-orange-100 text-orange-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Mercy Window Active
                </Badge>
              )}
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Discussion</span>
            </TabsTrigger>
            <TabsTrigger value="evidence" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Evidence</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>Case Details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <CourtRoomInterface
              caseId={caseId!}
              userRole={userRole}
              accessLevel={accessLevel}
            />
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EvidenceGallery
                  caseId={caseId!}
                  userRole={userRole}
                  canUpload={accessLevel === 'full' || accessLevel === 'mercy'}
                />
              </div>
              <div>
                {(accessLevel === 'full' || accessLevel === 'mercy') && (
                  <EvidenceUpload
                    caseId={caseId!}
                    userRole={userRole}
                    onUploadSuccess={() => {
                      // Refresh evidence gallery
                      window.location.reload();
                    }}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Case Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Case Number</label>
                    <p className="text-lg">{courtCase.case_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dispute Type</label>
                    <p className="text-lg">{courtCase.dispute_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Disputed Amount</label>
                    <p className="text-lg font-semibold">${courtCase.disputed_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-lg">{new Date(courtCase.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courtCase.case_participants.map((participant) => (
                    <div key={participant.participant_id} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{participant.profiles.full_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{participant.participant_type}</p>
                      </div>
                    </div>
                  ))}

                  {courtCase.judges && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Gavel className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{courtCase.judges.full_name}</p>
                        <p className="text-sm text-gray-500">
                          Judge - {courtCase.judges.specialization.join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
import { useState, useEffect } from "react";
import { FileText, Image, Video, Audio, File, Download, Eye, Shield, Clock, User, Scale, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EvidenceGalleryProps {
  caseId: string;
  userRole: 'learner' | 'provider' | 'judge';
  userId?: string;
  judgeId?: string;
}

interface Evidence {
  id: string;
  case_id: string;
  submitted_by: string;
  submitter_type: 'learner' | 'provider' | 'judge';
  evidence_type: 'text' | 'document' | 'image' | 'video' | 'audio' | 'screenshot' | 'system_log';
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  is_public: boolean;
  evidence_weight: 'minor' | 'normal' | 'major' | 'critical';
  verified: boolean;
  created_at: string;
}

export default function EvidenceGallery({ caseId, userRole, userId, judgeId }: EvidenceGalleryProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [submitterFilter, setSubmitterFilter] = useState<string>('all');
  const [weightFilter, setWeightFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'evidence_weight' | 'submitter_type'>('created_at');

  const currentUserId = judgeId || userId;

  useEffect(() => {
    fetchEvidence();
  }, [caseId]);

  useEffect(() => {
    applyFilters();
  }, [evidence, typeFilter, submitterFilter, weightFilter, verifiedFilter, sortBy]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispute_evidence')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter evidence based on user role and visibility
      const visibleEvidence = (data || []).filter(item => {
        // Judges can see all evidence
        if (userRole === 'judge') return true;
        
        // Non-judges can only see public evidence
        return item.is_public;
      });

      setEvidence(visibleEvidence);
    } catch (error) {
      console.error('Error fetching evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...evidence];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.evidence_type === typeFilter);
    }

    // Submitter filter
    if (submitterFilter !== 'all') {
      filtered = filtered.filter(item => item.submitter_type === submitterFilter);
    }

    // Weight filter
    if (weightFilter !== 'all') {
      filtered = filtered.filter(item => item.evidence_weight === weightFilter);
    }

    // Verified filter
    if (verifiedFilter !== 'all') {
      const isVerified = verifiedFilter === 'verified';
      filtered = filtered.filter(item => item.verified === isVerified);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'evidence_weight') {
        const weightOrder = { critical: 4, major: 3, normal: 2, minor: 1 };
        return weightOrder[b.evidence_weight] - weightOrder[a.evidence_weight];
      } else if (sortBy === 'submitter_type') {
        const typeOrder = { judge: 3, provider: 2, learner: 1 };
        return typeOrder[b.submitter_type] - typeOrder[a.submitter_type];
      }
      return 0;
    });

    setFilteredEvidence(filtered);
  };

  const handleVerifyEvidence = async (evidenceId: string, verified: boolean) => {
    if (userRole !== 'judge') return;

    try {
      const { error } = await supabase
        .from('dispute_evidence')
        .update({ verified })
        .eq('id', evidenceId);

      if (error) throw error;

      // Update local state
      setEvidence(prev => prev.map(item => 
        item.id === evidenceId ? { ...item, verified } : item
      ));

      // Log judge activity
      if (judgeId) {
        await supabase
          .from('judge_activity_log')
          .insert({
            judge_id: judgeId,
            case_id: caseId,
            activity_type: 'evidence_reviewed',
            description: `Judge ${verified ? 'verified' : 'unverified'} evidence: ${evidence.find(e => e.id === evidenceId)?.title}`,
            metadata: { evidence_id: evidenceId, verified }
          });
      }

    } catch (error) {
      console.error('Error updating evidence verification:', error);
      alert('Failed to update evidence verification');
    }
  };

  const getEvidenceTypeIcon = (evidenceType: string) => {
    switch (evidenceType) {
      case 'image': return { icon: Image, color: 'text-blue-400' };
      case 'video': return { icon: Video, color: 'text-red-400' };
      case 'audio': return { icon: Audio, color: 'text-green-400' };
      case 'document': return { icon: FileText, color: 'text-yellow-400' };
      case 'text': return { icon: FileText, color: 'text-gray-400' };
      default: return { icon: File, color: 'text-gray-400' };
    }
  };

  const getSubmitterIcon = (submitterType: string) => {
    switch (submitterType) {
      case 'judge': return { icon: Scale, color: 'text-yellow-400', label: 'Judge' };
      case 'provider': return { icon: User, color: 'text-purple-400', label: 'Provider' };
      case 'learner': return { icon: User, color: 'text-green-400', label: 'Learner' };
      default: return { icon: User, color: 'text-gray-400', label: 'Unknown' };
    }
  };

  const getWeightColor = (weight: string) => {
    switch (weight) {
      case 'critical': return 'text-red-400 bg-red-900 border-red-400';
      case 'major': return 'text-orange-400 bg-orange-900 border-orange-400';
      case 'normal': return 'text-blue-400 bg-blue-900 border-blue-400';
      case 'minor': return 'text-gray-400 bg-gray-700 border-gray-400';
      default: return 'text-gray-400 bg-gray-700 border-gray-400';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const handleDownload = (evidence: Evidence) => {
    if (evidence.file_url) {
      window.open(evidence.file_url, '_blank');
    }
  };

  const openModal = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedEvidence(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b7e84] mx-auto mb-4"></div>
          <p className="text-gray-300">Loading evidence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="document">Documents</option>
              <option value="text">Text</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Submitted by:</label>
            <select
              value={submitterFilter}
              onChange={(e) => setSubmitterFilter(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="all">All Parties</option>
              <option value="learner">Learner</option>
              <option value="provider">Provider</option>
              <option value="judge">Judge</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Weight:</label>
            <select
              value={weightFilter}
              onChange={(e) => setWeightFilter(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="all">All Weights</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="normal">Normal</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          {userRole === 'judge' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Verified:</label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-[#0b7e84]"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="created_at">Date Added</option>
              <option value="evidence_weight">Weight</option>
              <option value="submitter_type">Submitter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evidence Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-300">
          {filteredEvidence.length} of {evidence.length} evidence items
          {filteredEvidence.length !== evidence.length && ' (filtered)'}
        </p>
      </div>

      {/* Evidence Grid */}
      {filteredEvidence.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No Evidence Found</h3>
          <p className="text-gray-400">
            {evidence.length === 0 
              ? 'No evidence has been submitted for this case yet.'
              : 'No evidence matches your current filters.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvidence.map((item) => {
            const { icon: TypeIcon, color: typeColor } = getEvidenceTypeIcon(item.evidence_type);
            const { icon: SubmitterIcon, color: submitterColor, label: submitterLabel } = getSubmitterIcon(item.submitter_type);
            
            return (
              <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition">
                {/* Evidence Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <TypeIcon className={typeColor} size={20} />
                    <span className="text-xs text-gray-400 capitalize">{item.evidence_type}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full border text-xs ${getWeightColor(item.evidence_weight)}`}>
                      {item.evidence_weight}
                    </span>
                    
                    {!item.is_public && (
                      <div className="flex items-center space-x-1 text-yellow-400" title="Judge Only">
                        <Shield size={12} />
                      </div>
                    )}
                    
                    {item.verified && (
                      <div className="flex items-center space-x-1 text-green-400" title="Verified by Judge">
                        <CheckCircle size={12} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence Title and Description */}
                <h4 className="font-medium text-white mb-2 line-clamp-2">{item.title}</h4>
                
                {item.description && (
                  <p className="text-sm text-gray-300 mb-3 line-clamp-2">{item.description}</p>
                )}

                {/* Text Content Preview */}
                {item.content && (
                  <div className="bg-gray-700 border border-gray-600 rounded p-2 mb-3">
                    <p className="text-xs text-gray-300 line-clamp-3">{item.content}</p>
                  </div>
                )}

                {/* File Info */}
                {item.file_name && (
                  <div className="text-xs text-gray-400 mb-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.file_name}</span>
                      {item.file_size && <span>{formatFileSize(item.file_size)}</span>}
                    </div>
                  </div>
                )}

                {/* Evidence Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-600">
                  <div className="flex items-center space-x-1">
                    <SubmitterIcon className={submitterColor} size={12} />
                    <span>{submitterLabel}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                  <button
                    onClick={() => openModal(item)}
                    className="flex items-center space-x-1 text-[#0b7e84] hover:text-[#096a70] text-sm transition"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>

                  <div className="flex space-x-2">
                    {item.file_url && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="flex items-center space-x-1 text-gray-400 hover:text-white text-sm transition"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    )}

                    {userRole === 'judge' && (
                      <button
                        onClick={() => handleVerifyEvidence(item.id, !item.verified)}
                        className={`flex items-center space-x-1 text-sm transition ${
                          item.verified 
                            ? 'text-green-400 hover:text-green-300'
                            : 'text-yellow-400 hover:text-yellow-300'
                        }`}
                      >
                        {item.verified ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                        <span>{item.verified ? 'Verified' : 'Verify'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Evidence Detail Modal */}
      {showModal && selectedEvidence && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedEvidence.title}</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Evidence Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Content Area */}
                <div className="lg:col-span-2">
                  {selectedEvidence.content && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-white mb-2">Content</h4>
                      <div className="text-gray-300 whitespace-pre-wrap">{selectedEvidence.content}</div>
                    </div>
                  )}

                  {selectedEvidence.file_url && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-2">File Preview</h4>
                      
                      {selectedEvidence.evidence_type === 'image' && (
                        <img
                          src={selectedEvidence.file_url}
                          alt={selectedEvidence.title}
                          className="max-w-full h-auto rounded border border-gray-500"
                        />
                      )}

                      {selectedEvidence.evidence_type === 'video' && (
                        <video
                          src={selectedEvidence.file_url}
                          controls
                          className="max-w-full h-auto rounded border border-gray-500"
                        />
                      )}

                      {selectedEvidence.evidence_type === 'audio' && (
                        <audio
                          src={selectedEvidence.file_url}
                          controls
                          className="w-full"
                        />
                      )}

                      {selectedEvidence.evidence_type === 'document' && (
                        <div className="text-center py-8">
                          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-gray-300 mb-4">Document preview not available</p>
                          <button
                            onClick={() => handleDownload(selectedEvidence)}
                            className="bg-[#0b7e84] hover:bg-[#096a70] text-white px-4 py-2 rounded-lg transition"
                          >
                            Download File
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata Sidebar */}
                <div className="space-y-4">
                  <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Evidence Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white capitalize">{selectedEvidence.evidence_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weight:</span>
                        <span className={`capitalize ${getWeightColor(selectedEvidence.evidence_weight).split(' ')[0]}`}>
                          {selectedEvidence.evidence_weight}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Submitted by:</span>
                        <span className="text-white capitalize">{selectedEvidence.submitter_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white">{new Date(selectedEvidence.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Visibility:</span>
                        <span className="text-white">{selectedEvidence.is_public ? 'Public' : 'Judge Only'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Verified:</span>
                        <span className={selectedEvidence.verified ? 'text-green-400' : 'text-gray-400'}>
                          {selectedEvidence.verified ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedEvidence.file_name && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">File Information</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">Filename:</span>
                          <div className="text-white break-all">{selectedEvidence.file_name}</div>
                        </div>
                        {selectedEvidence.file_size && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Size:</span>
                            <span className="text-white">{formatFileSize(selectedEvidence.file_size)}</span>
                          </div>
                        )}
                        {selectedEvidence.file_type && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-white">{selectedEvidence.file_type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedEvidence.description && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Description</h4>
                      <p className="text-gray-300 text-sm">{selectedEvidence.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
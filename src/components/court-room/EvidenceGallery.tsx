import { useState, useEffect } from "react";

interface EvidenceGalleryProps {
  caseId: string;
  userRole: 'learner' | 'provider' | 'judge';
  canUpload: boolean;
}

export default function EvidenceGallery({ caseId, userRole, canUpload }: EvidenceGalleryProps) {
  const [evidence, setEvidence] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Fetch evidence for this case
  }, [caseId]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-6">
        Evidence Gallery
      </h3>

      {evidence.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No evidence has been submitted yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((item, index) => (
            <div key={index} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <p className="text-white font-medium">{item.title}</p>
              <p className="text-gray-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
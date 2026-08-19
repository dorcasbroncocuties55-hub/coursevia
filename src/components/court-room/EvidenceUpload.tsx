import { useState, useRef } from "react";
import { Upload, FileText, Image, Video, Audio, File, X, AlertTriangle, CheckCircle, Eye, Download, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EvidenceUploadProps {
  caseId: string;
  userId?: string;
  judgeId?: string;
  userRole: 'learner' | 'provider' | 'judge';
  onEvidenceUploaded: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export default function EvidenceUpload({ caseId, userId, judgeId, userRole, onEvidenceUploaded }: EvidenceUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceWeight, setEvidenceWeight] = useState<'minor' | 'normal' | 'major' | 'critical'>('normal');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserId = judgeId || userId;

  // File type validation
  const allowedTypes = {
    'image/jpeg': { icon: Image, color: 'text-blue-400', name: 'JPEG Image' },
    'image/png': { icon: Image, color: 'text-blue-400', name: 'PNG Image' },
    'image/gif': { icon: Image, color: 'text-blue-400', name: 'GIF Image' },
    'image/webp': { icon: Image, color: 'text-blue-400', name: 'WebP Image' },
    'application/pdf': { icon: FileText, color: 'text-red-400', name: 'PDF Document' },
    'application/msword': { icon: FileText, color: 'text-blue-600', name: 'Word Document' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-600', name: 'Word Document' },
    'video/mp4': { icon: Video, color: 'text-purple-400', name: 'MP4 Video' },
    'video/avi': { icon: Video, color: 'text-purple-400', name: 'AVI Video' },
    'video/mov': { icon: Video, color: 'text-purple-400', name: 'MOV Video' },
    'video/quicktime': { icon: Video, color: 'text-purple-400', name: 'QuickTime Video' },
    'audio/mp3': { icon: Audio, color: 'text-green-400', name: 'MP3 Audio' },
    'audio/wav': { icon: Audio, color: 'text-green-400', name: 'WAV Audio' },
    'audio/m4a': { icon: Audio, color: 'text-green-400', name: 'M4A Audio' },
    'text/plain': { icon: FileText, color: 'text-gray-400', name: 'Text File' }
  };

  const maxFileSize = 25 * 1024 * 1024; // 25MB

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds 25MB limit (${Math.round(file.size / 1024 / 1024)}MB)`;
    }

    if (!Object.keys(allowedTypes).includes(file.type)) {
      return `File type not allowed: ${file.type}`;
    }

    return null;
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const validation = validateFile(file);
      
      if (validation) {
        alert(`${file.name}: ${validation}`);
        continue;
      }

      const preview = await createFilePreview(file);
      
      newFiles.push({
        file,
        id: crypto.randomUUID(),
        preview,
        status: 'pending',
        progress: 0
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadToStorage = async (file: File, fileName: string): Promise<string> => {
    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${caseId}/${Date.now()}-${fileName}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('evidence-files')
      .upload(uniqueFileName, file);

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('evidence-files')
      .getPublicUrl(uniqueFileName);

    return urlData.publicUrl;
  };

  const uploadEvidence = async () => {
    if (!title.trim() || files.length === 0 || !currentUserId || uploading) return;

    setUploading(true);

    try {
      // Upload each file and create evidence records
      for (let i = 0; i < files.length; i++) {
        const fileUpload = files[i];
        
        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ));

        try {
          // Determine evidence type based on file type
          let evidenceType: string;
          if (fileUpload.file.type.startsWith('image/')) {
            evidenceType = 'image';
          } else if (fileUpload.file.type.startsWith('video/')) {
            evidenceType = 'video';
          } else if (fileUpload.file.type.startsWith('audio/')) {
            evidenceType = 'audio';
          } else {
            evidenceType = 'document';
          }

          // Upload file to storage
          const fileUrl = await uploadToStorage(fileUpload.file, fileUpload.file.name);

          // Update progress
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, progress: 50 }
              : f
          ));

          // Create evidence record via API
          const response = await fetch(`/api/court/case/${caseId}/evidence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId || '',
              'x-judge-id': judgeId || '',
              'x-user-role': userRole
            },
            body: JSON.stringify({
              title: files.length === 1 ? title : `${title} (${i + 1}/${files.length})`,
              description: description || undefined,
              evidenceType,
              fileName: fileUpload.file.name,
              fileUrl,
              fileSize: fileUpload.file.size,
              fileType: fileUpload.file.type,
              evidenceWeight,
              isPublic: userRole !== 'judge' || isPublic
            })
          });

          if (!response.ok) {
            throw new Error('Failed to create evidence record');
          }

          // Mark file as completed
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { ...f, status: 'completed', progress: 100 }
              : f
          ));

        } catch (error) {
          console.error(`Error uploading file ${fileUpload.file.name}:`, error);
          
          // Mark file as error
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  progress: 0,
                  error: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          ));
        }
      }

      // Check if all uploads completed successfully
      const allCompleted = files.every(f => f.status === 'completed');
      
      if (allCompleted) {
        // Reset form
        setFiles([]);
        setTitle('');
        setDescription('');
        setEvidenceWeight('normal');
        setIsPublic(true);
        
        // Notify parent component
        onEvidenceUploaded();
        
        alert(`Successfully uploaded ${files.length} evidence file(s)!`);
      }

    } catch (error) {
      console.error('Error in evidence upload:', error);
      alert('Failed to upload evidence. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    const typeInfo = allowedTypes[fileType as keyof typeof allowedTypes];
    if (!typeInfo) return { icon: File, color: 'text-gray-400' };
    return { icon: typeInfo.icon, color: typeInfo.color };
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Upload className="text-[#0b7e84]" size={24} />
          <span>Submit Evidence</span>
        </h3>
        <div className="text-xs text-gray-400">
          Max 25MB per file • Images, Videos, Documents, Audio
        </div>
      </div>

      {/* Evidence Details Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Evidence Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
            placeholder="Brief title describing the evidence"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0b7e84]"
            placeholder="Detailed description of what this evidence shows or proves"
            maxLength={500}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Evidence Weight
            </label>
            <select
              value={evidenceWeight}
              onChange={(e) => setEvidenceWeight(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#0b7e84]"
            >
              <option value="minor">Minor - Supporting information</option>
              <option value="normal">Normal - Standard evidence</option>
              <option value="major">Major - Important proof</option>
              <option value="critical">Critical - Key evidence</option>
            </select>
          </div>

          {userRole === 'judge' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Visibility
              </label>
              <div className="flex items-center space-x-4 mt-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="w-4 h-4 text-[#0b7e84] bg-gray-700 border-gray-600 focus:ring-[#0b7e84]"
                  />
                  <span className="text-sm text-gray-300">Public (all parties)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="w-4 h-4 text-[#0b7e84] bg-gray-700 border-gray-600 focus:ring-[#0b7e84]"
                  />
                  <span className="text-sm text-gray-300">Judge Only</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive 
            ? 'border-[#0b7e84] bg-gray-700' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={Object.keys(allowedTypes).join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <Upload className="mx-auto text-gray-400" size={48} />
          <div>
            <p className="text-lg text-white mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-400">
              Supported: Images (JPEG, PNG, GIF, WebP), Videos (MP4, AVI, MOV), 
              Documents (PDF, DOC, DOCX), Audio (MP3, WAV, M4A)
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-lg font-semibold text-white">Selected Files</h4>
          <div className="space-y-2">
            {files.map((fileUpload) => {
              const { icon: IconComponent, color } = getFileIcon(fileUpload.file.type);
              
              return (
                <div key={fileUpload.id} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    {/* File Icon and Preview */}
                    <div className="flex-shrink-0">
                      {fileUpload.preview ? (
                        <img
                          src={fileUpload.preview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded border border-gray-500"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                          <IconComponent className={color} size={24} />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white truncate">
                          {fileUpload.file.name}
                        </p>
                        {fileUpload.status === 'pending' && (
                          <button
                            onClick={() => removeFile(fileUpload.id)}
                            className="text-gray-400 hover:text-red-400 transition"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatFileSize(fileUpload.file.size)}</span>
                        <span className="capitalize">{fileUpload.file.type.split('/')[0]}</span>
                      </div>

                      {/* Progress Bar */}
                      {fileUpload.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="bg-gray-600 rounded-full h-1">
                            <div
                              className="bg-[#0b7e84] h-1 rounded-full transition-all duration-300"
                              style={{ width: `${fileUpload.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status Messages */}
                      {fileUpload.status === 'error' && (
                        <div className="mt-2 flex items-center space-x-1 text-red-400 text-xs">
                          <AlertTriangle size={12} />
                          <span>{fileUpload.error || 'Upload failed'}</span>
                        </div>
                      )}

                      {fileUpload.status === 'completed' && (
                        <div className="mt-2 flex items-center space-x-1 text-green-400 text-xs">
                          <CheckCircle size={12} />
                          <span>Upload completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {userRole === 'judge' && !isPublic && (
            <div className="flex items-center space-x-1 text-yellow-400">
              <Shield size={14} />
              <span>This evidence will only be visible to judges</span>
            </div>
          )}
        </div>
        
        <button
          onClick={uploadEvidence}
          disabled={!title.trim() || files.length === 0 || uploading}
          className="flex items-center space-x-2 bg-[#0b7e84] hover:bg-[#096a70] disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Submit Evidence</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
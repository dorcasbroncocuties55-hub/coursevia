/**
 * Storage Service - File upload/download for course content
 * Handles thumbnails, videos, attachments using Supabase Storage
 */
import { supabase } from "@/integrations/supabase/client";

// Storage bucket names
const BUCKETS = {
  THUMBNAILS: 'course-thumbnails',
  VIDEOS: 'course-videos',
  ATTACHMENTS: 'course-attachments',
  CERTIFICATES: 'certificates',
} as const;

// File size limits (in bytes)
const MAX_FILE_SIZES = {
  THUMBNAIL: 5 * 1024 * 1024, // 5MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  ATTACHMENT: 50 * 1024 * 1024, // 50MB
} as const;

// Allowed file types
const ALLOWED_TYPES = {
  THUMBNAIL: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
  ATTACHMENT: ['application/pdf', 'application/zip', 'text/plain', 'application/json'],
} as const;

// ============================================================================
// THUMBNAIL UPLOADS
// ============================================================================

/**
 * Upload course thumbnail
 */
export async function uploadCourseThumbnail(
  courseId: string,
  file: File
): Promise<{ data: { url: string; path: string } | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Validate file
    const validation = validateFile(file, 'THUMBNAIL');
    if (validation.error) throw validation.error;

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${courseId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKETS.THUMBNAILS)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.THUMBNAILS)
      .getPublicUrl(data.path);

    return {
      data: {
        url: urlData.publicUrl,
        path: data.path,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete course thumbnail
 */
export async function deleteCourseThumbnail(
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.storage
      .from(BUCKETS.THUMBNAILS)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================================================
// VIDEO UPLOADS
// ============================================================================

/**
 * Upload lesson video with progress tracking
 */
export async function uploadLessonVideo(
  lessonId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ data: { url: string; path: string } | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Validate file
    const validation = validateFile(file, 'VIDEO');
    if (validation.error) throw validation.error;

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${lessonId}/${Date.now()}.${fileExt}`;

    // Upload with progress tracking
    const { data, error } = await supabase.storage
      .from(BUCKETS.VIDEOS)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          if (onProgress && progress.totalBytes) {
            const percentage = (progress.loadedBytes / progress.totalBytes) * 100;
            onProgress(Math.round(percentage));
          }
        },
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.VIDEOS)
      .getPublicUrl(data.path);

    return {
      data: {
        url: urlData.publicUrl,
        path: data.path,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete lesson video
 */
export async function deleteLessonVideo(
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.storage
      .from(BUCKETS.VIDEOS)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get signed URL for private video streaming
 */
export async function getVideoStreamUrl(
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ data: { url: string } | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.storage
      .from(BUCKETS.VIDEOS)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return {
      data: { url: data.signedUrl },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// ATTACHMENT UPLOADS
// ============================================================================

/**
 * Upload lesson attachment (PDF, ZIP, etc.)
 */
export async function uploadLessonAttachment(
  lessonId: string,
  file: File
): Promise<{ data: { url: string; path: string; name: string } | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Validate file
    const validation = validateFile(file, 'ATTACHMENT');
    if (validation.error) throw validation.error;

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user.id}/${lessonId}/${Date.now()}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .getPublicUrl(data.path);

    return {
      data: {
        url: urlData.publicUrl,
        path: data.path,
        name: file.name,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Delete lesson attachment
 */
export async function deleteLessonAttachment(
  path: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .remove([path]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * List all attachments for a lesson
 */
export async function listLessonAttachments(
  lessonId: string
): Promise<{ data: Array<{ name: string; url: string; size: number }> | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .list(`${user.id}/${lessonId}`);

    if (error) throw error;

    const attachments = await Promise.all(
      (data || []).map(async (file) => {
        const { data: urlData } = supabase.storage
          .from(BUCKETS.ATTACHMENTS)
          .getPublicUrl(`${user.id}/${lessonId}/${file.name}`);

        return {
          name: file.name,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
        };
      })
    );

    return { data: attachments, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Upload multiple files (thumbnails or attachments)
 */
export async function uploadMultipleFiles(
  files: File[],
  type: 'thumbnail' | 'attachment',
  resourceId: string
): Promise<{ 
  data: Array<{ url: string; path: string; name: string }> | null; 
  error: Error | null;
  failed: Array<{ file: string; error: string }>;
}> {
  try {
    const results = await Promise.allSettled(
      files.map(file => 
        type === 'thumbnail' 
          ? uploadCourseThumbnail(resourceId, file)
          : uploadLessonAttachment(resourceId, file)
      )
    );

    const successful: Array<{ url: string; path: string; name: string }> = [];
    const failed: Array<{ file: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.data) {
        successful.push({
          ...result.value.data,
          name: files[index].name,
        });
      } else if (result.status === 'rejected' || result.value.error) {
        failed.push({
          file: files[index].name,
          error: result.status === 'rejected' 
            ? result.reason.message 
            : result.value.error?.message || 'Unknown error',
        });
      }
    });

    return { data: successful, error: null, failed };
  } catch (error) {
    return { data: null, error: error as Error, failed: [] };
  }
}

/**
 * Delete all files for a course (cleanup)
 */
export async function deleteCourseFiles(
  courseId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Delete thumbnail
    await supabase.storage
      .from(BUCKETS.THUMBNAILS)
      .remove([`${courseId}`]);

    // List and delete all videos for course lessons
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (lessons) {
      for (const lesson of lessons) {
        await supabase.storage
          .from(BUCKETS.VIDEOS)
          .remove([`${user.id}/${lesson.id}`]);

        await supabase.storage
          .from(BUCKETS.ATTACHMENTS)
          .remove([`${user.id}/${lesson.id}`]);
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

// ============================================================================
// VALIDATION & HELPERS
// ============================================================================

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  type: 'THUMBNAIL' | 'VIDEO' | 'ATTACHMENT'
): { error: Error | null } {
  try {
    // Check file size
    const maxSize = MAX_FILE_SIZES[type];
    if (file.size > maxSize) {
      throw new Error(
        `File too large. Maximum size is ${formatFileSize(maxSize)}`
      );
    }

    // Check file type
    const allowedTypes = ALLOWED_TYPES[type];
    if (!allowedTypes.includes(file.type as any)) {
      throw new Error(
        `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
      );
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if file is image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Generate video thumbnail from video file
 */
export async function generateVideoThumbnail(
  videoFile: File,
  seekTo: number = 1.0
): Promise<{ data: Blob | null; error: Error | null }> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        resolve({ data: null, error: new Error('Canvas not supported') });
        return;
      }

      video.addEventListener('loadeddata', () => {
        video.currentTime = Math.min(seekTo, video.duration);
      });

      video.addEventListener('seeked', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ data: blob, error: null });
          } else {
            resolve({ data: null, error: new Error('Failed to generate thumbnail') });
          }
        }, 'image/jpeg', 0.95);
      });

      video.addEventListener('error', () => {
        resolve({ data: null, error: new Error('Failed to load video') });
      });

      video.src = URL.createObjectURL(videoFile);
      video.load();
    } catch (error) {
      resolve({ data: null, error: error as Error });
    }
  });
}

/**
 * Get video duration
 */
export async function getVideoDuration(
  videoFile: File
): Promise<{ data: number | null; error: Error | null }> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');

      video.addEventListener('loadedmetadata', () => {
        resolve({ data: Math.round(video.duration), error: null });
      });

      video.addEventListener('error', () => {
        resolve({ data: null, error: new Error('Failed to load video') });
      });

      video.src = URL.createObjectURL(videoFile);
      video.load();
    } catch (error) {
      resolve({ data: null, error: error as Error });
    }
  });
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<{ data: File | null; error: Error | null }> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ data: null, error: new Error('Canvas not supported') });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve({ data: compressedFile, error: null });
              } else {
                resolve({ data: null, error: new Error('Failed to compress image') });
              }
            },
            'image/jpeg',
            quality
          );
        };

        img.onerror = () => {
          resolve({ data: null, error: new Error('Failed to load image') });
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        resolve({ data: null, error: new Error('Failed to read file') });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      resolve({ data: null, error: error as Error });
    }
  });
}

/**
 * CoursePlayer Component - Video player with progress tracking
 * Features: Video streaming, progress saving, lesson navigation, attachments
 */
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Minimize, Download, CheckCircle } from 'lucide-react';
import { updateLessonProgress, completLesson, getLessonProgress } from '@/lib/api/enrollmentService';
import { getVideoStreamUrl } from '@/lib/api/storageService';

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'article' | 'quiz';
  video_url?: string;
  video_duration?: number;
  content?: string;
  attachments?: Array<{ name: string; url: string; size: number }>;
  order_index: number;
}

interface CoursePlayerProps {
  lesson: Lesson;
  courseId: string;
  onComplete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export default function CoursePlayer({
  lesson,
  courseId,
  onComplete,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: CoursePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lastSavedProgress, setLastSavedProgress] = useState(0);
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);

  // Load video URL and progress
  useEffect(() => {
    if (lesson.type === 'video' && lesson.video_url) {
      loadVideoUrl();
      loadProgress();
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [lesson.id]);

  // Load signed video URL
  const loadVideoUrl = async () => {
    if (!lesson.video_url) return;

    const { data, error } = await getVideoStreamUrl(lesson.video_url, 7200); // 2 hours
    if (data && !error) {
      setVideoUrl(data.url);
    }
  };

  // Load lesson progress
  const loadProgress = async () => {
    const { data } = await getLessonProgress(lesson.id);
    if (data) {
      setCurrentTime(data.last_position_seconds || 0);
      setIsCompleted(data.status === 'completed');
      if (videoRef.current) {
        videoRef.current.currentTime = data.last_position_seconds || 0;
      }
    }
  };

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (lesson.type === 'video' && isPlaying) {
      progressSaveInterval.current = setInterval(() => {
        saveProgress();
      }, 10000);
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [isPlaying, currentTime]);

  // Save progress to database
  const saveProgress = async () => {
    if (Math.abs(currentTime - lastSavedProgress) < 5) return; // Don't save if less than 5s difference

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    await updateLessonProgress(lesson.id, {
      videoProgressSeconds: Math.floor(currentTime),
      progressPercentage: Math.floor(progressPercentage),
      status: progressPercentage >= 90 ? 'completed' : 'in_progress',
    });

    setLastSavedProgress(currentTime);

    // Auto-complete if watched 90%+
    if (progressPercentage >= 90 && !isCompleted) {
      handleComplete();
    }
  };

  // Handle video events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Update buffered
      if (videoRef.current.buffered.length > 0) {
        setBuffered(videoRef.current.buffered.end(0));
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    saveProgress(); // Save on pause
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!isCompleted) {
      handleComplete();
    }
  };

  // Control functions
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleComplete = async () => {
    await completLesson(lesson.id);
    setIsCompleted(true);
    onComplete?.();
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render video player
  if (lesson.type === 'video') {
    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              Loading video...
            </div>
          )}

          {/* Completion Badge */}
          {isCompleted && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Completed
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              style={{
                background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Previous Lesson */}
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full transition"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              {/* Next Lesson */}
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-5 h-5 text-white" />
              </button>

              {/* Skip Controls */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => skip(-10)}
                  className="px-2 py-1 text-xs text-white hover:bg-gray-700 rounded transition"
                >
                  -10s
                </button>
                <button
                  onClick={() => skip(10)}
                  className="px-2 py-1 text-xs text-white hover:bg-gray-700 rounded transition"
                >
                  +10s
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="p-2 hover:bg-gray-700 rounded-lg transition">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 hover:bg-gray-700 rounded-lg transition">
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lesson Info */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-2">{lesson.title}</h3>
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Attachments</h4>
              <div className="space-y-1">
                {lesson.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    download
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
                  >
                    <Download className="w-4 h-4" />
                    {attachment.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render article content
  if (lesson.type === 'article') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{lesson.title}</h1>
          
          {isCompleted && (
            <div className="mb-6 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Completed</span>
            </div>
          )}

          <div
            className="prose prose-indigo max-w-none"
            dangerouslySetInnerHTML={{ __html: lesson.content || '' }}
          />

          {!isCompleted && (
            <button
              onClick={handleComplete}
              className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
            >
              Mark as Complete
            </button>
          )}

          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-2">
                {lesson.attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment.url}
                    download
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition"
                  >
                    <Download className="w-5 h-5" />
                    {attachment.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render quiz (placeholder)
  if (lesson.type === 'quiz') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{lesson.title}</h1>
        <p className="text-gray-600">Quiz functionality coming soon...</p>
      </div>
    );
  }

  return null;
}

import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  color = 'text-blue-600' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-solid border-gray-300 border-t-transparent',
          sizeClasses[size],
          color
        )}
        style={{
          borderTopColor: 'transparent'
        }}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

// Alternative spinner with dots animation
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-center space-x-1', className)}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

// Text loading with ellipsis
export const LoadingText: React.FC<{ text?: string; className?: string }> = ({ 
  text = 'Loading', 
  className 
}) => {
  return (
    <div className={cn('flex items-center', className)}>
      <span>{text}</span>
      <div className="ml-2 flex space-x-1">
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};
/**
 * Reusable loading spinner component
 * Use this instead of returning null when waiting for auth/data
 */
export const LoadingSpinner = ({ fullScreen = false }: { fullScreen?: boolean }) => {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
};

/**
 * Page-level loading state
 * Use this for dashboard pages that need auth
 */
export const PageLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

/**
 * Content loading state
 * Use this for sections within a page
 */
export const ContentLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center space-y-3">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      <p className="text-xs text-muted-foreground">Loading content...</p>
    </div>
  </div>
);

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollableContentProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  showScrollbar?: boolean;
}

export const ScrollableContent = ({ 
  children, 
  className, 
  maxHeight = "max-h-80", 
  showScrollbar = false 
}: ScrollableContentProps) => {
  // h-full means no clipping - just render children normally
  if (maxHeight === "h-full" || maxHeight === "h-screen") {
    return (
      <div className={cn("w-full", className)}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "overflow-y-auto",
        maxHeight,
        showScrollbar ? "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" : "scrollbar-hide",
        className
      )}
    >
      {children}
    </div>
  );
};
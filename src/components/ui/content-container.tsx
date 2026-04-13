import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  scrollable?: boolean;
}

export const ContentContainer = ({ 
  children, 
  className, 
  maxHeight = "max-h-96", 
  scrollable = true 
}: ContentContainerProps) => {
  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        scrollable && "overflow-y-auto",
        maxHeight,
        className
      )}
    >
      {children}
    </div>
  );
};
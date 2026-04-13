import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export const ExpandableText = ({ 
  text, 
  maxLength = 200, 
  className = "" 
}: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <p className={className}>{text}</p>;
  }

  const truncatedText = text.slice(0, maxLength);
  
  return (
    <div className={className}>
      <p className="mb-2">
        {isExpanded ? text : `${truncatedText}...`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-0 text-primary hover:text-primary/80"
      >
        {isExpanded ? (
          <>
            Show less <ChevronUp size={16} className="ml-1" />
          </>
        ) : (
          <>
            Show more <ChevronDown size={16} className="ml-1" />
          </>
        )}
      </Button>
    </div>
  );
};
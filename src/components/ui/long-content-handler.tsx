import { type ReactNode } from "react";
import { ContentContainer } from "./content-container";
import { ExpandableText } from "./expandable-text";
import { ScrollableContent } from "./scrollable-content";

interface LongContentHandlerProps {
  content: string | ReactNode;
  type?: "text" | "component";
  maxTextLength?: number;
  maxHeight?: string;
  containerClassName?: string;
  textClassName?: string;
  scrollable?: boolean;
}

export const LongContentHandler = ({
  content,
  type = "text",
  maxTextLength = 300,
  maxHeight = "max-h-96",
  containerClassName,
  textClassName,
  scrollable = true
}: LongContentHandlerProps) => {
  if (type === "text" && typeof content === "string") {
    // For text content, use expandable text if it's long
    if (content.length > maxTextLength) {
      return (
        <ContentContainer 
          className={containerClassName}
          maxHeight={maxHeight}
          scrollable={false}
        >
          <ExpandableText 
            text={content} 
            maxLength={maxTextLength}
            className={textClassName}
          />
        </ContentContainer>
      );
    }
    
    // Short text doesn't need special handling
    return <p className={textClassName}>{content}</p>;
  }

  // For component content, use scrollable container
  return (
    <ContentContainer 
      className={containerClassName}
      maxHeight={maxHeight}
      scrollable={scrollable}
    >
      {scrollable ? (
        <ScrollableContent maxHeight="h-full">
          {content}
        </ScrollableContent>
      ) : (
        content
      )}
    </ContentContainer>
  );
};
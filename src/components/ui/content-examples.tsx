import { ContentContainer } from "./content-container";
import { ExpandableText } from "./expandable-text";
import { ScrollableContent } from "./scrollable-content";
import { LongContentHandler } from "./long-content-handler";

// Example usage of all content handling components
export const ContentExamples = () => {
  const longText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.";

  const longContentList = Array.from({ length: 20 }, (_, i) => (
    <div key={i} className="p-4 border border-border rounded-lg">
      <h3 className="font-semibold">Item {i + 1}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        This is a sample item with some content that demonstrates scrollable behavior.
      </p>
    </div>
  ));

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">Content Handling Examples</h2>
      
      {/* Expandable Text Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Expandable Text</h3>
        <ContentContainer>
          <ExpandableText 
            text={longText}
            maxLength={150}
            className="text-sm"
          />
        </ContentContainer>
      </div>

      {/* Scrollable Content Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Scrollable Content</h3>
        <ScrollableContent maxHeight="max-h-64" className="space-y-3">
          {longContentList}
        </ScrollableContent>
      </div>

      {/* Long Content Handler - Text */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Long Content Handler (Text)</h3>
        <LongContentHandler 
          content={longText}
          type="text"
          maxTextLength={200}
        />
      </div>

      {/* Long Content Handler - Component */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Long Content Handler (Component)</h3>
        <LongContentHandler 
          content={<div className="space-y-3">{longContentList.slice(0, 10)}</div>}
          type="component"
          maxHeight="max-h-80"
        />
      </div>
    </div>
  );
};
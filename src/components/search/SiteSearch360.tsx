import { useEffect } from 'react';

interface SiteSearch360Props {
  siteId: string;
}

export const SiteSearch360 = ({ siteId }: SiteSearch360Props) => {
  useEffect(() => {
    // Load Site Search 360 script
    const script = document.createElement('script');
    script.src = `https://js.sitesearch360.com/plugin/bundle/${siteId}.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.body.removeChild(script);
    };
  }, [siteId]);

  return (
    <div id="ss360-search-box" className="w-full">
      {/* Site Search 360 will inject the search box here */}
    </div>
  );
};

export default SiteSearch360;

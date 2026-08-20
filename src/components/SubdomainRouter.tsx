import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import JudgeLogin from './judge-portal/JudgeLogin';
import JudgePortalApp from './judge-portal/JudgePortalApp';

const SubdomainRouter = () => {
  const [subdomain, setSubdomain] = useState<string>('');

  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomainMatch = hostname.match(/^([^.]+)\./);
    
    if (subdomainMatch) {
      const extractedSubdomain = subdomainMatch[1];
      setSubdomain(extractedSubdomain);
    }
  }, []);

  // Handle different subdomains
  if (subdomain === 'console') {
    const path = window.location.pathname;
    
    // Check if it's judge-login or judge-portal based on the path or additional subdomain parts
    if (window.location.hostname.includes('judge-login')) {
      return <JudgeLogin />;
    } else if (window.location.hostname.includes('judge-portal')) {
      return <JudgePortalApp />;
    }
  }

  // Default routing for main domain
  return (
    <Routes>
      <Route path="/judge-portal/*" element={<JudgePortalApp />} />
      <Route path="/judge-login" element={<JudgeLogin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default SubdomainRouter;
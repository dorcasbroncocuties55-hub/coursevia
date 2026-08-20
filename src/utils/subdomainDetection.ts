export const getSubdomain = (): string => {
  const hostname = window.location.hostname;
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }
  
  // Extract subdomain from hostname
  const parts = hostname.split('.');
  
  // For console.judge-login.coursevia.site or console.judge-portal.coursevia.site
  if (parts.length >= 4) {
    const subdomain = parts[0]; // console
    const service = parts[1]; // judge-login or judge-portal
    return `${subdomain}.${service}`;
  }
  
  // For simpler subdomains
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return '';
};

export const getJudgePortalType = (): 'login' | 'portal' | null => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('judge-login')) {
    return 'login';
  } else if (hostname.includes('judge-portal')) {
    return 'portal';
  }
  
  return null;
};

export const isJudgeSubdomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('judge-login') || hostname.includes('judge-portal');
};
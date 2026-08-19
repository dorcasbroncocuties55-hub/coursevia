// Subdomain routing utility for Judge Portal
export const getSubdomain = () => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Check for judge portal subdomains
  if (hostname.includes('console.judge-login.coursevia.site')) {
    return 'judge-login';
  }
  
  if (hostname.includes('console.judge-portal.coursevia.site')) {
    return 'judge-portal';
  }
  
  return null;
};

export const isJudgePortalDomain = () => {
  const subdomain = getSubdomain();
  return subdomain === 'judge-login' || subdomain === 'judge-portal';
};

export const getJudgePortalRedirect = () => {
  const subdomain = getSubdomain();
  
  if (subdomain === 'judge-login') {
    return '/judge-portal/login';
  }
  
  if (subdomain === 'judge-portal') {
    return '/judge-portal/dashboard';
  }
  
  return null;
};
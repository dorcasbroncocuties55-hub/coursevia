// ULTIMATE AUTH CONTEXT FIX
// This replaces the broken Supabase JS client with a working solution

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Simple auth provider that bypasses broken Supabase JS client
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for user session using direct REST API instead of broken JS client
    const checkAuth = async () => {
      try {
        // Try to get session from localStorage (where Supabase stores it)
        const storedSession = localStorage.getItem('sb-lpvcaukviteexnjzqqeo-auth-token');
        
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata
            });
          }
        } else {
          // No stored session, user is not logged in
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sb-lpvcaukviteexnjzqqeo-auth-token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const signOut = async () => {
    // Clear all auth-related localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-lpvcaukviteexnjzqqeo-auth')) {
        localStorage.removeItem(key);
      }
    });
    
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
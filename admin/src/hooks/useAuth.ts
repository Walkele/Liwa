import { useState, useEffect, createContext, useContext } from 'react';
import { AdminUser } from '@/types';
import axios from 'axios';

interface AuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthProvider() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        setAdmin(response.data.admin);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await axios.post('/api/auth/logout');
      setAdmin(null);
    } catch (error) {
      console.error('Logout error:', error);
      setAdmin(null); // Clear admin state even if API call fails
    }
  };

  const checkAuth = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        setAdmin(response.data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error('Check auth error:', error);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    admin,
    loading,
    login,
    logout,
    checkAuth,
  };
}

export { AuthContext };
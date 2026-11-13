import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { api } from '../utils/api.ts';
import { clearOfflineCache } from '../utils/offlineCache.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  activateStudent: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginAs: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (!api.getToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await api.get<User>('/auth/me');
      setUser(data);
    } catch (err) {
      console.warn('Failed to load current user profile:', err);
      api.setToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    api.onUnauthorized(() => {
      setUser(null);
      setToken(null);
    });
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const activateStudent = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/activate', {
      email,
      password,
    });
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    await clearOfflineCache();
  };

  const quickLoginAs = async (email: string) => {
    setIsLoading(true);
    try {
      await login(email, 'password123');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        activateStudent,
        logout,
        quickLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, TOKEN_KEY } from '@/api/apiClient';

export type UserRole = 'admin' | 'user' | 'member';

export type FreightNetwork = 'WCA' | 'MPL' | 'EAN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  company?: string;
  name?: string;
  nationality?: string;
  networks?: FreightNetwork[];
}

interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, company?: string, name?: string, nationality?: string, networks?: FreightNetwork[]) => Promise<AuthResult>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then((userData: User) => setUser(userData))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body?.error?.message || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    company?: string,
    name?: string,
    nationality?: string,
    networks?: FreightNetwork[]
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, password_confirmation: password,
          company, name, nationality,
          networks: networks && networks.length > 0 ? networks : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body?.error?.message || 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('No token found');

      const res = await fetch(`${API_URL}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          current_password: currentPassword, 
          password: newPassword,
          password_confirmation: newPassword
        }),
      });

      if (res.ok) {
        return { success: true };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body?.error || body?.errors?.[0] || 'Password update failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{
      user, login, signup, logout, updatePassword,
      isAuthenticated: !!user,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

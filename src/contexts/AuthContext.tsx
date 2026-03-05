import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'admin' | 'user' | 'member';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  company?: string;
  name?: string;
  nationality?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, company?: string, name?: string, nationality?: string) => Promise<AuthResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// @ts-expect-error - vite injects env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'smartQuoteToken';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

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
        return { success: true };
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
    nationality?: string
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, password_confirmation: password,
          company, name, nationality,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true };
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

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{
      user, login, signup, logout,
      isAuthenticated: !!user,
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

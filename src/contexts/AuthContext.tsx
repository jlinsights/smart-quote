import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user' | 'member';

export interface User {
  id?: number;
  email: string;
  role: UserRole;
  company?: string;
  name?: string;
  nationality?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (email: string, password?: string, company?: string, name?: string, nationality?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// @ts-expect-error - vite injects env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// In a real application, this would be handled by a secure backend database.
// For this frontend implementation, we use localStorage to mock user records.
const PREDEFINED_ADMINS = [
  { email: 'ceo@goodmangls.com',        password: 'password', role: 'admin' },
  { email: 'ken.jeon@goodmangls.com',   password: 'password', role: 'admin' },
  { email: 'jaehong.lim@goodmangls.com',password: 'password', role: 'admin' },
  { email: 'charlie@goodmangls.com',    password: 'password', role: 'admin' },
  { email: 'ch.lee@jways.co.kr',        password: 'password', role: 'admin' },
];

const MOCK_USERS_KEY = 'smartQuoteMockUsers';
const CURRENT_USER_KEY = 'smartQuoteCurrentUser';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize predefined admin users
    const usersData = localStorage.getItem(MOCK_USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];
    
    let updated = false;
    PREDEFINED_ADMINS.forEach(admin => {
      const existingUser = users.find((u: User) => u.email === admin.email);
      if (!existingUser) {
        users.push(admin);
        updated = true;
      } else if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        updated = true;
      }
    });

    if (updated || !usersData) {
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
    }

    // Auto-migrate legacy local storage users to Rails Database (one-time sync)
    if (users.length > 0 && !localStorage.getItem('smartQuoteUsersMigratedToRails')) {
      fetch(`${API_URL}/api/v1/auth/sync_legacy_users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`Successfully migrated ${data.migrated_count} local users to Rails DB!`);
          localStorage.setItem('smartQuoteUsersMigratedToRails', 'true');
        }
      })
      .catch(err => console.error("Failed to migrate users to Rails DB:", err));
    }


    const storedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (storedUser) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsInitialized(true);
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('smartQuoteToken', data.token);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const signup = async (
    email: string,
    password?: string,
    company?: string,
    name?: string,
    nationality?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, password_confirmation: password, company, name, nationality })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('smartQuoteToken', data.token);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('smartQuoteToken');
    setUser(null);
  };

  if (!isInitialized) return null;

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
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

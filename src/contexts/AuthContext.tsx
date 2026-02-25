import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'user';

export interface User {
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => boolean;
  signup: (email: string, password?: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In a real application, this would be handled by a secure backend database.
// For this frontend implementation, we use localStorage to mock user records.
const ADMIN_EMAIL = 'admin@goodmangls.com';
const ADMIN_PASSWORD = 'password';

const MOCK_USERS_KEY = 'smartQuoteMockUsers';
const CURRENT_USER_KEY = 'smartQuoteCurrentUser';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize admin user if empty
    const usersData = localStorage.getItem(MOCK_USERS_KEY);
    if (!usersData) {
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify([{ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' }]));
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

  const login = (email: string, password?: string): boolean => {
    const usersData = localStorage.getItem(MOCK_USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];
    
    // Check credentials
    const foundUser = users.find((u: User & { password?: string }) => u.email === email && u.password === password);
    
    if (foundUser) {
        const authUser: User = { email: foundUser.email, role: foundUser.role };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
        setUser(authUser);
        return true;
    }
    return false;
  };

  const signup = (email: string, password?: string): boolean => {
    const usersData = localStorage.getItem(MOCK_USERS_KEY);
    const users = usersData ? JSON.parse(usersData) : [];
    
    const exists = users.find((u: User & { password?: string }) => u.email === email);
    if (exists) {
        return false; // User already exists
    }

    // Create new external user
    const newUser = { email, password, role: 'user' };
    users.push(newUser);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

    const authUser: User = { email: newUser.email, role: newUser.role as UserRole };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
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

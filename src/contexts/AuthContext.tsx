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
const PREDEFINED_ADMINS = [
  { email: 'ceo@goodmangls.com', password: 'password', role: 'admin' },
  { email: 'ken.jeon@goodmangls.com', password: 'password', role: 'admin' },
  { email: 'jaehong.lim@goodmangls.com', password: 'password', role: 'admin' }
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

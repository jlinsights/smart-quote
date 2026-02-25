import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [email, setEmail] = useState<string | null>(
    () => localStorage.getItem('smartQuoteUserEmail')
  );

  const login = (userEmail: string) => {
    localStorage.setItem('smartQuoteUserEmail', userEmail);
    setEmail(userEmail);
  };

  const logout = () => {
    localStorage.removeItem('smartQuoteUserEmail');
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ email, login, logout, isAuthenticated: !!email }}>
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

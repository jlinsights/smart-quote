import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    allowedEmails?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin, allowedEmails }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the route requires admin but the user is not admin, redirect them to their allowed dashboard
  if (requireAdmin && user?.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
  }

  // If the route is restricted to specific emails
  if (allowedEmails && (!user?.email || !allowedEmails.includes(user.email))) {
      return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

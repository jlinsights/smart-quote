import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import QuoteCalculator from './pages/QuoteCalculator';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { LandingPage } from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* User & Client Route - External Quotes without Margin Breakdown */}
          {/* Admin can also access this to see how it looks to clients */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <QuoteCalculator isPublic={true} />
              </ProtectedRoute>
            }
          />

          {/* Internal Admin Route - Protected strictly for Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <QuoteCalculator isPublic={false} />
              </ProtectedRoute>
            }
          />

          {/* Fallback to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

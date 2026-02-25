import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import QuoteCalculator from './pages/QuoteCalculator';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route - External Quotes without Margin Breakdown */}
          <Route path="/" element={<QuoteCalculator isPublic={true} />} />

          {/* Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Internal Dashboard Route - Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ChannelTalk } from './components/ChannelTalk';
import { AiChatWidget } from './components/AiChatWidget';

const QuoteCalculator = React.lazy(() => import('./pages/QuoteCalculator'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const UserGuidePage = React.lazy(() => import('./pages/UserGuidePage'));
const FlightSchedulePage = React.lazy(() => import('./pages/FlightSchedulePage'));

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <ChannelTalk />
            <AiChatWidget />
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><div className="w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-jways-500 rounded-full animate-spin" /></div>}>
              <Routes>
                {/* Public Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />

                {/* Customer Dashboard - Weather, News, Recent Quotes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <CustomerDashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Public Quote Calculator (no margin breakdown) */}
                <Route
                  path="/quote"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <QuoteCalculator isPublic={true} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Internal Admin Route - Protected strictly for Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <ErrorBoundary>
                        <QuoteCalculator isPublic={false} />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* Flight Schedule - Restricted to specific users */}
                <Route
                  path="/schedule"
                  element={
                    <ProtectedRoute allowedEmails={['jaehong.lim@goodmangls.com', 'charlie@goodmangls.com']}>
                      <ErrorBoundary>
                        <FlightSchedulePage />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />

                {/* User Guide - Public */}
                <Route
                  path="/guide"
                  element={
                    <ErrorBoundary>
                      <UserGuidePage />
                    </ErrorBoundary>
                  }
                />

                {/* Fallback to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

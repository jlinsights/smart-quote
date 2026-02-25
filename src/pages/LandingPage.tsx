import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Globe, TrendingUp, ShieldCheck } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <img src="/goodman-gls-logo.png" alt="Goodman GLS" className="h-8 w-auto" />
              <span className="ml-3 text-xl font-bold text-gray-900 tracking-tight">Smart Quote</span>
            </div>
            <div className="flex space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Log In
              </Link>
              <Link to="/signup" className="bg-jways-600 text-white hover:bg-jways-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gray-50 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-10 sm:pt-16 lg:pt-20">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Global logistics quoting</span>{' '}
                  <span className="block text-jways-600 xl:inline">made lightning fast.</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Instantly calculate reliable shipping quotes including UPS, DHL, E-MAX integrations, taxes, and specialized fees. Join leading shippers managing global freight intelligently.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link to="/signup" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-jways-600 hover:bg-jways-700 md:py-4 md:text-lg md:px-10 transition-colors">
                      Get Started
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link to="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-jways-700 bg-jways-100 hover:bg-jways-200 md:py-4 md:text-lg md:px-10 transition-colors">
                      Log In
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 flex items-center justify-center bg-gray-100 border-l border-gray-200">
             {/* Mock Dashboard Illustration / Abstract Design */}
            <div className="w-full h-full p-12 lg:p-24 flex items-center justify-center text-gray-300">
               <Globe className="w-full h-full max-w-md max-h-md opacity-20" />
            </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 text-white">
                    <Zap className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Instant Quotes</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Calculate Door-to-Door and Door-to-Airport rates instantly with real-time variables.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 text-white">
                    <TrendingUp className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Accurate Breakdown</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Detailed view of FSC, customs duties, packing logistics, and origin/destination fees.
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 text-white">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Verified Carriers</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500">
                  Quotes based on authentic structures from premium logistics partners.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-gray-500 text-sm">© 2025 Goodman GLS & J-Ways. All rights reserved.</p>
          </div>
      </footer>
    </div>
  );
};

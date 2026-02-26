import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, ShieldCheck, ArrowRight, Globe, Package, Truck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useLanguage } from '../contexts/LanguageContext';

/* ── tiny dot-grid SVG (inline, no extra file) ── */
const dotGridStyle: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      <Header />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-jways-950 to-gray-900 dark:from-gray-950 dark:via-jways-950 dark:to-gray-950">
        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={dotGridStyle} />

        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-jways-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-jways-500/15 blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* ── Left: Copy ── */}
            <div className="flex-1 text-center lg:text-left">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-jways-500/10 border border-jways-500/20 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jways-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-jways-500" />
                </span>
                <span className="text-xs sm:text-sm font-medium text-jways-300 tracking-wide">
                  UPS · DHL · E-MAX
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1]">
                <span className="text-white">{t('landing.title.main')}</span>{' '}
                <span className="bg-gradient-to-r from-jways-400 to-cyan-400 bg-clip-text text-transparent">
                  {t('landing.title.sub')}
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('landing.subtitle')}
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-jways-600 hover:bg-jways-500 text-white text-base font-semibold rounded-xl shadow-lg shadow-jways-600/25 hover:shadow-jways-500/30 transition-all duration-200"
                >
                  {t('landing.getStarted')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-200 text-base font-semibold rounded-xl backdrop-blur-sm transition-all duration-200"
                >
                  {t('nav.login')}
                </Link>
              </div>
            </div>

            {/* ── Right: Hero visual (floating cards) ── */}
            <div className="relative flex-1 w-full max-w-lg lg:max-w-none">
              {/* Main card */}
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-jways-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-jways-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">SQ-2026-0147</div>
                    <div className="text-xs text-gray-500">Seoul → Los Angeles</div>
                  </div>
                </div>

                {/* Mock quote rows */}
                <div className="space-y-3">
                  {[
                    { carrier: 'UPS', zone: 'Z5', amount: '₩487,200' },
                    { carrier: 'DHL', zone: 'Z4', amount: '₩512,800' },
                    { carrier: 'E-MAX', zone: '—', amount: '₩398,500' },
                  ].map((row) => (
                    <div
                      key={row.carrier}
                      className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-jways-400 bg-jways-500/10 px-2 py-0.5 rounded">
                          {row.carrier}
                        </span>
                        <span className="text-sm text-gray-400">Zone {row.zone}</span>
                      </div>
                      <span className="text-sm font-bold text-white tabular-nums">{row.amount}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Margin 18.5%</span>
                  <span className="text-lg font-extrabold text-white">₩398,500</span>
                </div>
              </div>

              {/* Floating accent cards */}
              <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-green-500/10 backdrop-blur border border-green-500/20 rounded-xl px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs font-semibold text-green-400">Live Rates</span>
                </div>
              </div>

              <div className="absolute -bottom-3 -left-3 sm:-bottom-5 sm:-left-5 bg-white/5 backdrop-blur border border-white/10 rounded-xl px-4 py-2.5 shadow-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-jways-400" />
                  <span className="text-xs font-semibold text-gray-300">47 Global Ports</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="mt-20 pt-10 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: '3', label: 'Carriers', icon: Truck },
              { value: '190+', label: 'Countries', icon: Globe },
              { value: '< 1s', label: 'Calculation', icon: Zap },
              { value: '24/7', label: 'Available', icon: ShieldCheck },
            ].map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-jways-500" />
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</span>
                </div>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-jways-600 dark:text-jways-400 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">
              Everything you need for accurate quotes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: Zap,
                color: 'text-amber-500',
                bg: 'bg-amber-500/10 dark:bg-amber-500/10',
                title: t('landing.instantQuotes'),
                desc: t('landing.instantQuotes.desc'),
              },
              {
                icon: TrendingUp,
                color: 'text-jways-500',
                bg: 'bg-jways-500/10 dark:bg-jways-500/10',
                title: t('landing.accurateBreakdown'),
                desc: t('landing.accurateBreakdown.desc'),
              },
              {
                icon: ShieldCheck,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
                title: t('landing.verifiedCarriers'),
                desc: t('landing.verifiedCarriers.desc'),
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group bg-white dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-100 dark:border-gray-700/50 hover:border-jways-200 dark:hover:border-jways-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feat.bg} mb-5`}>
                  <feat.icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            © 2025 Goodman GLS & J-Ways. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

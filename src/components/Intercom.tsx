import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const APP_ID = import.meta.env.VITE_INTERCOM_APP_ID || 'k5z51xs2';
const WIDGET_URL = `https://widget.intercom.io/widget/${APP_ID}`;

/** Inject Intercom script once */
function loadScript() {
  if (document.getElementById('intercom-script')) return;
  const s = document.createElement('script');
  s.id = 'intercom-script';
  s.src = WIDGET_URL;
  s.async = true;
  document.head.appendChild(s);
}

/** Safe wrapper around window.Intercom */
function ic(method: string, arg?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
    if (arg) {
      window.Intercom(method, arg);
    } else {
      window.Intercom(method);
    }
  }
}

declare global {
  interface Window {
    Intercom?: (...args: unknown[]) => void;
    intercomSettings?: Record<string, unknown>;
  }
}

export function Intercom() {
  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);

  // Load script on mount
  useEffect(() => {
    if (!APP_ID) return;
    loadScript();
  }, []);

  // Boot/reboot when user changes
  useEffect(() => {
    if (!APP_ID) return;

    const boot = () => {
      if (user) {
        ic('boot', {
          app_id: APP_ID,
          user_id: String(user.id),
          name: user.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          ...(user.company ? { company: { company_id: user.company, name: user.company } } : {}),
          custom_attributes: {
            role: user.role,
            nationality: user.nationality || '',
          },
        });
      } else {
        ic('boot', { app_id: APP_ID });
      }
    };

    const currentUserId = user ? String(user.id) : null;

    // User changed (login/logout/switch) → shutdown then reboot
    if (prevUserIdRef.current !== currentUserId) {
      if (prevUserIdRef.current !== null) {
        ic('shutdown');
      }
      // Wait for script to load if first boot
      if (typeof window.Intercom === 'function') {
        boot();
      } else {
        // Script still loading — wait for it
        const script = document.getElementById('intercom-script');
        if (script) {
          script.addEventListener('load', boot, { once: true });
        }
      }
      prevUserIdRef.current = currentUserId;
    } else if (user) {
      // Same user, profile may have updated
      ic('update', {
        name: user.name || '',
        email: user.email || '',
      });
    }

    return () => {};
  }, [user]);

  // Shutdown on unmount
  useEffect(() => {
    return () => { ic('shutdown'); };
  }, []);

  return null;
}

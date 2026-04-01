import { useEffect, useRef } from 'react';
import IntercomSDK, { shutdown, update } from '@intercom/messenger-js-sdk';
import { useAuth } from '@/contexts/AuthContext';

const INTERCOM_APP_ID = import.meta.env.VITE_INTERCOM_APP_ID || 'k5z51xs2';

export function Intercom() {
  const { user } = useAuth();
  const bootedRef = useRef(false);
  const prevUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!INTERCOM_APP_ID) return;

    // User logged out → shutdown to clear session
    if (!user) {
      if (bootedRef.current) {
        shutdown();
        bootedRef.current = false;
        prevUserIdRef.current = null;
      }
      // Boot anonymous visitor
      IntercomSDK({ app_id: INTERCOM_APP_ID });
      bootedRef.current = true;
      return;
    }

    const userData = {
      app_id: INTERCOM_APP_ID,
      user_id: String(user.id),
      name: user.name || user.email?.split('@')[0] || '',
      email: user.email || '',
      company: user.company ? { name: user.company } : undefined,
      role: user.role,
      nationality: user.nationality || '',
    };

    // Different user logged in → shutdown old session first
    if (bootedRef.current && prevUserIdRef.current !== null && prevUserIdRef.current !== user.id) {
      shutdown();
      bootedRef.current = false;
    }

    if (!bootedRef.current) {
      // Fresh boot with user data
      IntercomSDK(userData as Parameters<typeof IntercomSDK>[0]);
      bootedRef.current = true;
    } else {
      // Same user, profile may have changed → update
      update({
        name: userData.name,
        email: userData.email,
        company: userData.company,
        role: user.role,
        nationality: user.nationality || '',
      });
    }

    prevUserIdRef.current = user.id;
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bootedRef.current) {
        shutdown();
        bootedRef.current = false;
      }
    };
  }, []);

  return null;
}

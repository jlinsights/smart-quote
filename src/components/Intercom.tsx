import { useEffect, useRef } from 'react';
import IntercomSDK, { boot, shutdown, update } from '@intercom/messenger-js-sdk';
import { useAuth } from '@/contexts/AuthContext';

const INTERCOM_APP_ID = import.meta.env.VITE_INTERCOM_APP_ID || 'k5z51xs2';

export function Intercom() {
  const { user } = useAuth();
  const initializedRef = useRef(false);
  const prevUserIdRef = useRef<number | null>(null);

  // Initialize SDK once (injects script tag)
  useEffect(() => {
    if (!INTERCOM_APP_ID || initializedRef.current) return;
    IntercomSDK({ app_id: INTERCOM_APP_ID });
    initializedRef.current = true;
  }, []);

  // Handle user changes via boot/shutdown/update
  useEffect(() => {
    if (!initializedRef.current) return;

    if (!user) {
      // Logged out → restart as anonymous visitor
      shutdown();
      boot({ app_id: INTERCOM_APP_ID });
      prevUserIdRef.current = null;
      return;
    }

    const bootData = {
      app_id: INTERCOM_APP_ID,
      user_id: String(user.id),
      name: user.name || user.email?.split('@')[0] || '',
      email: user.email || '',
      company: user.company ? { name: user.company } : undefined,
      role: user.role,
      nationality: user.nationality || '',
    };

    if (prevUserIdRef.current !== null && prevUserIdRef.current !== user.id) {
      // Different user → shutdown old session, boot new
      shutdown();
      boot(bootData);
    } else if (prevUserIdRef.current === null) {
      // First login → shutdown anonymous, boot with user
      shutdown();
      boot(bootData);
    } else {
      // Same user, profile may have changed
      update({
        name: bootData.name,
        email: bootData.email,
        company: bootData.company,
        role: user.role,
        nationality: user.nationality || '',
      });
    }

    prevUserIdRef.current = user.id;
  }, [user]);

  return null;
}

import { useEffect } from 'react';
import IntercomSDK from '@intercom/messenger-js-sdk';
import { useAuth } from '@/contexts/AuthContext';

const INTERCOM_APP_ID = import.meta.env.VITE_INTERCOM_APP_ID || 'k5z51xs2';

export function Intercom() {
  const { user } = useAuth();

  useEffect(() => {
    if (!INTERCOM_APP_ID) return;

    if (user) {
      IntercomSDK({
        app_id: INTERCOM_APP_ID,
        user_id: String(user.id),
        name: user.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        company: user.company ? { name: user.company } : undefined,
        custom_attributes: {
          role: user.role,
          nationality: user.nationality || '',
        },
      } as Parameters<typeof IntercomSDK>[0]);
    } else {
      IntercomSDK({
        app_id: INTERCOM_APP_ID,
      });
    }
  }, [user]);

  return null;
}

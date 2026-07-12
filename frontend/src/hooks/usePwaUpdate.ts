import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toastSuccess } from '@/components/ui/toast';

export function usePwaUpdate() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every hour
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toastSuccess('App update available — refresh to apply');
      // Auto-update after 3 seconds
      setTimeout(() => updateServiceWorker(true), 3000);
    }
  }, [needRefresh, updateServiceWorker]);
}

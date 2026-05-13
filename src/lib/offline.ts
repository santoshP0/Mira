import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';

// Wire AppState changes → React Query focus manager (triggers refetch on foreground)
export function useAppStateFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);
}

// Returns true when the app is in the foreground
export function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      setIsActive(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return isActive;
}

// Wire React Query's online manager to fetch-based connectivity check.
// Fires a lightweight HEAD request to confirm internet reachability whenever
// a query fails, so React Query can automatically retry when connectivity returns.
export function setupOnlineManager() {
  onlineManager.setEventListener((setOnline) => {
    let timeout: ReturnType<typeof setTimeout>;

    async function check() {
      try {
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
        });
        setOnline(true);
      } catch {
        setOnline(false);
        timeout = setTimeout(check, 5000);
      }
    }

    // Start monitoring only after first error (don't probe on startup)
    return () => clearTimeout(timeout);
  });
}

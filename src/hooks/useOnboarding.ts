import { useCallback, useEffect, useState } from 'react';

const ONBOARDING_KEY = 'pokercursor.onboarding.v1';

function loadCompletion(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === 'complete';
  } catch {
    return false;
  }
}

function saveCompletion(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'complete');
  } catch {
    // Onboarding still works for this session if localStorage is unavailable.
  }
}

export function useOnboarding() {
  const [isOpen, setIsOpen] = useState(() => !loadCompletion());

  const scrollToAppStart = useCallback(() => {
    if (typeof window === 'undefined') return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.getElementById('root')?.focus({ preventScroll: true });
    });
  }, []);

  const complete = useCallback(() => {
    saveCompletion();
    setIsOpen(false);
    scrollToAppStart();
  }, [scrollToAppStart]);

  const restart = useCallback(() => {
    scrollToAppStart();
    setIsOpen(true);
  }, [scrollToAppStart]);

  useEffect(() => {
    if (typeof document === 'undefined' || !isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return {
    isOnboardingOpen: isOpen,
    completeOnboarding: complete,
    restartOnboarding: restart,
  };
}

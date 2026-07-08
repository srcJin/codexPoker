import { useCallback, useState } from 'react';

function readDisclosureState(storageKey: string, defaultOpen: boolean): boolean {
  if (typeof window === 'undefined') {
    return defaultOpen;
  }

  try {
    const saved = window.localStorage.getItem(storageKey);

    if (saved === 'open') {
      return true;
    }

    if (saved === 'closed') {
      return false;
    }
  } catch {
    return defaultOpen;
  }

  return defaultOpen;
}

function writeDisclosureState(storageKey: string, isOpen: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, isOpen ? 'open' : 'closed');
  } catch {
    // Ignore storage failures so help panels still work in private browsing.
  }
}

export function usePersistentDisclosure(storageKey: string, defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(() => readDisclosureState(storageKey, defaultOpen));

  const setOpen = useCallback((nextOpen: boolean) => {
    writeDisclosureState(storageKey, nextOpen);
    setIsOpen(nextOpen);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      const nextOpen = !current;
      writeDisclosureState(storageKey, nextOpen);
      return nextOpen;
    });
  }, [storageKey]);

  return { isOpen, setOpen, toggle };
}

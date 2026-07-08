import { useId } from 'react';
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure';

interface NewUserGuidanceProps {
  title: string;
  items: string[];
  storageKey: string;
  defaultOpen?: boolean;
}

export function NewUserGuidance({
  title,
  items,
  storageKey,
  defaultOpen = false,
}: NewUserGuidanceProps) {
  const contentId = useId();
  const { isOpen, toggle } = usePersistentDisclosure(`pokercursor.guidance.v1.${storageKey}`, defaultOpen);

  return (
    <section className="new-user-guidance">
      <button
        type="button"
        className="new-user-guidance__toggle"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <strong>{isOpen ? 'Hide' : 'Show'}</strong>
      </button>
      {isOpen ? (
        <ul id={contentId} className="new-user-guidance__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

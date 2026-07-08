import { useMemo, useState } from 'react';
import { usePersistentDisclosure } from '../hooks/usePersistentDisclosure';

interface GlossaryTerm {
  term: string;
  definition: string;
}

interface GlossaryPanelProps {
  defaultOpen?: boolean;
  storageKey?: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Pot odds',
    definition: 'The price of a call compared with the pot you can win.',
  },
  {
    term: 'Equity',
    definition: 'Your hand chance to win or tie by showdown.',
  },
  {
    term: 'VPIP',
    definition: 'Voluntarily put chips in pot preflop; a quick read on how loose you play.',
  },
  {
    term: 'Aggression',
    definition: 'How often a player bets or raises instead of checking or calling.',
  },
  {
    term: 'Value bet',
    definition: 'A bet made because worse hands can call.',
  },
  {
    term: 'Bluff',
    definition: 'A bet or raise designed to make better hands fold.',
  },
  {
    term: 'Range',
    definition: 'The set of hands a player can reasonably have in a spot.',
  },
  {
    term: 'Position',
    definition: 'Your order to act; later position sees more decisions before choosing.',
  },
  {
    term: 'Fold equity',
    definition: 'The chance your bet wins immediately because opponents fold.',
  },
];

export function GlossaryPanel({
  defaultOpen = false,
  storageKey = 'default',
}: GlossaryPanelProps) {
  const [query, setQuery] = useState('');
  const { isOpen, toggle } = usePersistentDisclosure(`pokercursor.glossary.v1.${storageKey}`, defaultOpen);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTerms = useMemo(() => {
    if (!normalizedQuery) {
      return GLOSSARY_TERMS;
    }

    return GLOSSARY_TERMS.filter((entry) => {
      const haystack = `${entry.term} ${entry.definition}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  return (
    <section className="glossary-panel">
      <div className="section-heading">
        <h3>Poker Glossary</h3>
        <button
          type="button"
          className="glossary-panel__toggle"
          onClick={toggle}
          aria-expanded={isOpen}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {isOpen ? (
        <>
          <input
            className="glossary-panel__search"
            type="search"
            value={query}
            placeholder="Search terms"
            aria-label="Search poker glossary"
            onChange={(event) => setQuery(event.target.value)}
          />
          <dl className="glossary-panel__terms">
            {visibleTerms.map((entry) => (
              <div key={entry.term} className="glossary-panel__term">
                <dt>{entry.term}</dt>
                <dd>{entry.definition}</dd>
              </div>
            ))}
          </dl>
          {visibleTerms.length === 0 ? (
            <p className="glossary-panel__empty">No glossary terms match that search.</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

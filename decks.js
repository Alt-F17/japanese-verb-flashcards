import { VERB_DECKS, VERBS } from './verbs.js';
import { NOUN_DECKS, NOUNS } from './nouns.js';

export const ALL_CARDS = [...VERBS, ...NOUNS];
export const DEFAULT_DECK_ID = VERB_DECKS[0].id;

const deck = (id, label, cards, unit) => ({ id, label: `${label} (${cards.length})`, cards, unit });

export const DECK_GROUPS = [
  {
    label: 'Verbs',
    decks: [
      ...VERB_DECKS.map((d, i) => deck(d.id, `Verbs ${i + 1}: ${d.label}`, d.cards, 'verbs')),
      deck('all-verbs', 'All verbs', VERBS, 'verbs'),
    ],
  },
  {
    label: 'Nouns',
    decks: [
      ...NOUN_DECKS.map((d, i) => deck(d.id, `Nouns ${i + 1}: ${d.label}`, d.cards, 'nouns')),
      deck('all-nouns', 'All nouns', NOUNS, 'nouns'),
    ],
  },
  {
    label: 'Mixed',
    decks: [deck('all', 'Everything', ALL_CARDS, 'words')],
  },
];

const DECKS = new Map(DECK_GROUPS.flatMap((g) => g.decks).map((d) => [d.id, d]));

export const isDeckId = (id) => DECKS.has(id);
export const getDeck = (id) => DECKS.get(id) ?? DECKS.get(DEFAULT_DECK_ID);

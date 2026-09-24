export function shuffle(items, rng = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sameOrder = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function createDeck(ids, rng = Math.random) {
  return { all: ids.slice(), queue: shuffle(ids, rng), completed: 0 };
}

export const current = (state) => (state.queue.length ? state.queue[0] : null);
export const isDone = (state) => state.queue.length === 0;
export const total = (state) => state.all.length;

export function markCorrect(state) {
  if (isDone(state)) return state;
  return { ...state, queue: state.queue.slice(1), completed: state.completed + 1 };
}

// Reinsert somewhere after at least one other card, so a missed card never repeats back-to-back
// unless it is the only one left.
export function markIncorrect(state, rng = Math.random) {
  if (isDone(state)) return state;
  const [card, ...rest] = state.queue;
  const at = rest.length === 0 ? 0 : 1 + Math.floor(rng() * rest.length);
  rest.splice(at, 0, card);
  return { ...state, queue: rest };
}

export function reshuffle(state, rng = Math.random) {
  if (state.queue.length < 2) return state;
  let queue = shuffle(state.queue, rng);
  for (let tries = 0; sameOrder(queue, state.queue) && tries < 20; tries++) {
    queue = shuffle(state.queue, rng);
  }
  if (sameOrder(queue, state.queue)) queue = [...queue.slice(1), queue[0]];
  return { ...state, queue };
}

export const reset = (state, rng = Math.random) => createDeck(state.all, rng);

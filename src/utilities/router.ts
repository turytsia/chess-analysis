import { useSyncExternalStore } from 'react';

const HASH_CHANGE_EVENT = 'hashchange';
const GAME_SEGMENT = 'games';

export type Route = { name: 'library' } | { name: 'game'; gameId: string };

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribeToHash, getHash));
}

export function navigate(route: Route): void {
  window.location.hash = toHref(route);
}

export function toHref(route: Route): string {
  if (route.name === 'game') {
    return `#/${GAME_SEGMENT}/${encodeURIComponent(route.gameId)}`;
  }
  return '#/';
}

function parseRoute(hash: string): Route {
  const [section, parameter] = hash.replace(/^#\/?/, '').split('/');
  if (section === GAME_SEGMENT && parameter) {
    return { name: 'game', gameId: decodeURIComponent(parameter) };
  }
  return { name: 'library' };
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener(HASH_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(HASH_CHANGE_EVENT, onChange);
}

function getHash(): string {
  return window.location.hash;
}

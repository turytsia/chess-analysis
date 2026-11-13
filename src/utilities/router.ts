import { useSyncExternalStore } from 'react';

const HASH_CHANGE_EVENT = 'hashchange';
const GAME_SEGMENT = 'games';
const TRAINER_SEGMENT = 'trainer';
const TRAINER_VIEWS: ReadonlyArray<string> = ['browse', 'drill', 'games'];

export type TrainerView = 'browse' | 'drill' | 'games';

export type Route =
  | { name: 'library' }
  | { name: 'game'; gameId: string }
  | { name: 'trainer'; view: TrainerView };

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
  if (route.name === 'trainer') {
    return `#/${TRAINER_SEGMENT}/${route.view}`;
  }
  return '#/';
}

export function toTrainerView(value: string | undefined): TrainerView {
  return isTrainerView(value) ? value : 'browse';
}

function parseRoute(hash: string): Route {
  const [section, parameter] = hash.replace(/^#\/?/, '').split('/');
  if (section === GAME_SEGMENT && parameter) {
    return { name: 'game', gameId: decodeURIComponent(parameter) };
  }
  if (section === TRAINER_SEGMENT) {
    return { name: 'trainer', view: toTrainerView(parameter) };
  }
  return { name: 'library' };
}

function isTrainerView(value: string | undefined): value is TrainerView {
  return value !== undefined && TRAINER_VIEWS.includes(value);
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener(HASH_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(HASH_CHANGE_EVENT, onChange);
}

function getHash(): string {
  return window.location.hash;
}

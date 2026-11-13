import type { StoredGame } from './db';
import {
  followSequence,
  getNodeName,
  type Opening,
  type OpeningNode,
} from './openings';

export type DeviationSide = 'user' | 'opponent';

interface BookMove {
  san: string;
  name: string | undefined;
}

export interface TheoryDeviation {
  game: StoredGame;
  side: DeviationSide;
  ply: number;
  playedSan: string;
  path: Array<string>;
  opening: Opening | undefined;
  bookMoves: Array<BookMove>;
}

export interface DeviationGroup {
  key: string;
  side: DeviationSide;
  ply: number;
  playedSan: string;
  path: Array<string>;
  opening: Opening | undefined;
  bookMoves: Array<BookMove>;
  games: Array<StoredGame>;
}

/*
 * Walks the game along the opening tree. The deviation is the first move that
 * is not in the tree while the tree still had moves to offer; a game that runs
 * past the end of a known line simply outlasted theory and is not reported.
 * Games that leave the tree before `minBookPlies` never entered the opening.
 */
export function findTheoryDeviation(
  root: OpeningNode,
  game: StoredGame,
  minBookPlies: number
): TheoryDeviation | undefined {
  const followed = followSequence(root, game.sanMoves);
  const lastNode = followed[followed.length - 1];
  const playedSan = game.sanMoves[followed.length];
  if (
    !lastNode ||
    followed.length < minBookPlies ||
    playedSan === undefined ||
    lastNode.children.size === 0
  ) {
    return undefined;
  }

  const mover = followed.length % 2 === 0 ? 'white' : 'black';
  return {
    game,
    side: mover === game.userColor ? 'user' : 'opponent',
    ply: followed.length + 1,
    playedSan,
    path: game.sanMoves.slice(0, followed.length),
    opening: followed.reduce<Opening | undefined>(
      (deepest, node) => node.opening ?? deepest,
      undefined
    ),
    bookMoves: [...lastNode.children.values()].map((child) => ({
      san: child.san,
      name: getNodeName(child),
    })),
  };
}

export function groupDeviations(
  deviations: Array<TheoryDeviation>
): Array<DeviationGroup> {
  const groups = deviations.reduce((byKey, deviation) => {
    const key = [...deviation.path, deviation.playedSan].join(' ');
    const { game, ...shared } = deviation;
    const existing = byKey.get(key);
    return byKey.set(key, {
      ...shared,
      key,
      games: [...(existing?.games ?? []), game],
    });
  }, new Map<string, DeviationGroup>());

  return [...groups.values()].sort(
    (a, b) => b.games.length - a.games.length || a.ply - b.ply
  );
}

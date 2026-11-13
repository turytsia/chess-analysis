const TRANSPOSITION_MAX_PLY = 40;

let openingBookPromise: Promise<OpeningBook> | undefined;

export interface Opening {
  id: string;
  eco: string;
  name: string;
  moves: Array<string>;
  epd: string;
}

interface OpeningNode {
  san: string;
  ply: number;
  opening: Opening | undefined;
  children: Map<string, OpeningNode>;
}

export interface OpeningBook {
  openings: Array<Opening>;
  root: OpeningNode;
  byEpd: Map<string, Opening>;
}

interface OpeningMatch {
  opening: Opening | undefined;
  bookPlies: number;
}

interface PlayedMove {
  san: string;
  fenAfter: string;
}

export function loadOpeningBook(): Promise<OpeningBook> {
  openingBookPromise ??= import('../data/openingBook.json').then(
    ({ default: entries }) =>
      createOpeningBook(
        entries.map(([eco, name, moves, epd]) => ({
          id: moves,
          eco,
          name,
          moves: moves.split(' '),
          epd,
        }))
      )
  );
  return openingBookPromise;
}

export function createOpeningBook(openings: Array<Opening>): OpeningBook {
  const root = createNode('', 0);
  openings.forEach((opening) => {
    const leaf = opening.moves.reduce((node, san) => {
      const existing = node.children.get(san);
      if (existing) {
        return existing;
      }
      const child = createNode(san, node.ply + 1);
      node.children.set(san, child);
      return child;
    }, root);
    leaf.opening = opening;
  });

  return {
    openings,
    root,
    byEpd: new Map(openings.map((opening) => [opening.epd, opening])),
  };
}

/*
 * A move is "book" when the game still follows a known move order, or when it
 * reaches a named position through a different move order (a transposition).
 * The opening name is the deepest named position found either way.
 */
export function matchOpening(
  book: OpeningBook,
  moves: Array<PlayedMove>
): OpeningMatch {
  const sequence = followSequence(
    book.root,
    moves.map(({ san }) => san)
  );
  const sequenceOpening = sequence.reduce<Opening | undefined>(
    (deepest, node) => node.opening ?? deepest,
    undefined
  );

  return moves.slice(0, TRANSPOSITION_MAX_PLY).reduce<OpeningMatch>(
    (match, move, index) => {
      const transposed = book.byEpd.get(toEpd(move.fenAfter));
      return transposed && index + 1 > match.bookPlies
        ? { opening: transposed, bookPlies: index + 1 }
        : match;
    },
    { opening: sequenceOpening, bookPlies: sequence.length }
  );
}

function followSequence(
  root: OpeningNode,
  sans: Array<string>
): Array<OpeningNode> {
  const path: Array<OpeningNode> = [];
  let node: OpeningNode | undefined = root;
  for (const san of sans) {
    node = node.children.get(san);
    if (!node) {
      break;
    }
    path.push(node);
  }
  return path;
}

export function toEpd(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

function createNode(san: string, ply: number): OpeningNode {
  return { san, ply, opening: undefined, children: new Map() };
}

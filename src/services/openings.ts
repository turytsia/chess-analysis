const CARO_KANN_FIRST_ECO = 'B10';
const CARO_KANN_LAST_ECO = 'B19';
const TRANSPOSITION_MAX_PLY = 40;
const NAME_PART_SEPARATOR = /: |, /;

let openingBookPromise: Promise<OpeningBook> | undefined;
let caroKannBookPromise: Promise<OpeningBook> | undefined;

export interface Opening {
  id: string;
  eco: string;
  name: string;
  moves: Array<string>;
  epd: string;
}

export interface OpeningNode {
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

export function followSequence(
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

export function loadCaroKannBook(): Promise<OpeningBook> {
  caroKannBookPromise ??= loadOpeningBook().then((book) =>
    createOpeningBook(
      book.openings.filter(
        ({ eco }) => eco >= CARO_KANN_FIRST_ECO && eco <= CARO_KANN_LAST_ECO
      )
    )
  );
  return caroKannBookPromise;
}

/*
 * Many tree nodes sit between two named openings. Such a node is described by
 * what all named lines below it have in common, e.g. every line after
 * 3... Bf5 in the Advance shares "Caro-Kann Defense: Advance Variation".
 */
export function getNodeName(node: OpeningNode): string | undefined {
  if (node.opening) {
    return node.opening.name;
  }
  const [first, ...others] = collectOpenings(node).map(({ name }) =>
    name.split(NAME_PART_SEPARATOR)
  );
  if (!first) {
    return undefined;
  }
  const mismatch = first.findIndex((part, index) =>
    others.some((parts) => parts[index] !== part)
  );
  const [family, ...variations] =
    mismatch === -1 ? first : first.slice(0, mismatch);
  if (family === undefined) {
    return undefined;
  }
  return variations.length > 0 ? `${family}: ${variations.join(', ')}` : family;
}

export function countLines(node: OpeningNode): number {
  return collectOpenings(node).length;
}

export function toEpd(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

function collectOpenings(node: OpeningNode): Array<Opening> {
  return [
    ...(node.opening ? [node.opening] : []),
    ...[...node.children.values()].flatMap(collectOpenings),
  ];
}

function createNode(san: string, ply: number): OpeningNode {
  return { san, ply, opening: undefined, children: new Map() };
}

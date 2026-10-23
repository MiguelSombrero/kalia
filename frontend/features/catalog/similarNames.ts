const MIN_LENGTH = 2;
const MAX_SIMILAR = 5;

const words = (name: string): string[] =>
  name
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MIN_LENGTH);

const folded = (name: string): string => words(name).join("");

/**
 * The beers whose names look like `name`: with case, spaces and punctuation
 * ignored, one contains the other or they share a word (ADR-0082). A hint
 * before submitting, not the API's duplicate rule.
 */
export const similarlyNamed = <T extends { name: string }>(name: string, beers: readonly T[]): T[] => {
  const typed = folded(name);
  if (typed.length < MIN_LENGTH) {
    return [];
  }
  const typedWords = new Set(words(name));
  return beers
    .filter((beer) => {
      const other = folded(beer.name);
      return (
        (other.length >= MIN_LENGTH && (other.includes(typed) || typed.includes(other))) ||
        words(beer.name).some((word) => typedWords.has(word))
      );
    })
    .slice(0, MAX_SIMILAR);
};

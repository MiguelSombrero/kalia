const firstLetter = (part: string): string => Array.from(part.toUpperCase())[0];

export const initialsOf = (username: string): string => {
  const parts = username.split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  const letters = parts.slice(0, 2).map(firstLetter);
  if (letters.length > 0) return letters.join("");
  return Array.from(username.trim())[0]?.toUpperCase() ?? "";
};

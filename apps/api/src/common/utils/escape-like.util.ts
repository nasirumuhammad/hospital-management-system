const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g;

export function toContainsPattern(term: string): string {
  return `%${term.trim().replace(LIKE_SPECIAL_CHARACTERS, '\\$&')}%`;
}

export const POSITION_ORDER = [
  "Prop",
  "Hooker",
  "Lock",
  "Back row",
  "Scrum half",
  "Centre",
  "Back 3"
];

export function getPositionSortIndex(position: string | undefined | null): number {
  if (!position) return 999;
  const index = POSITION_ORDER.findIndex(p => p.toLowerCase() === position.toLowerCase().trim());
  return index === -1 ? 999 : index;
}

export function sortPlayersByPosition<T extends { position?: string | null }>(players: T[]): T[] {
    return [...players].sort((a, b) => getPositionSortIndex(a.position) - getPositionSortIndex(b.position));
}

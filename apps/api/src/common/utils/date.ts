export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Días [from, to) — to es exclusivo. */
export function enumerateDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor < end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

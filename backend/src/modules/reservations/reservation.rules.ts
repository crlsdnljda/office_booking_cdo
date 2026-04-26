import type { Reservation } from '@prisma/client';

export const effectiveEnd = (r: Reservation): Date => r.releasedEarlyAt ?? r.endAt;

export const actualDurationMs = (r: Reservation): number =>
  effectiveEnd(r).getTime() - r.startAt.getTime();

export const cooldownEnd = (r: Reservation): Date =>
  new Date(effectiveEnd(r).getTime() + actualDurationMs(r));

export const overlaps = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean => aStart < bEnd && bStart < aEnd;

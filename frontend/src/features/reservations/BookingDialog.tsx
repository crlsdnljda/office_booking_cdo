import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import type { Reservation, ReservationType, Room } from '@/api/types';
import { ROOM_LABEL } from '@/api/types';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
  reservations: Reservation[];
  currentUserId?: string;
  onCreated: (reservation: Reservation) => void;
};

const ERROR_LABEL: Record<string, string> = {
  slot_conflict: 'Ese hueco se ha ocupado o solapa con otra reserva.',
  cooldown_active: 'Estas en periodo de espera tras una reserva reciente.',
  already_have_active_reservation: 'Ya tienes una reserva activa o futura.',
  max_24h: 'Maximo 24 horas.',
  min_one_hour: 'Minimo 1 hora.',
  must_be_on_hour: 'Las reservas son por horas en punto.',
  cannot_reserve_in_past: 'No puedes reservar en el pasado.',
};

type HourStatus = {
  hour: number;
  past: boolean;
  occupied: boolean;
  cooldown: boolean;
  occupiedBy?: string;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dayLabel = (d: Date) => {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Manana';
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
};

export const BookingDialog = ({
  open,
  onOpenChange,
  room,
  reservations,
  currentUserId,
  onCreated,
}: Props) => {
  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [type, setType] = useState<ReservationType>('SOLO');
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDay(startOfDay(new Date()));
      setType('SOLO');
      setError(null);
      setSelStart(null);
      setSelEnd(null);
    }
  }, [open]);

  // Reset selection when day or type changes
  useEffect(() => {
    setSelStart(null);
    setSelEnd(null);
    setError(null);
  }, [day, type]);

  const hourStatus: HourStatus[] = useMemo(() => {
    const now = new Date();
    const myReservations = currentUserId
      ? reservations.filter((r) => r.user.id === currentUserId)
      : [];

    return Array.from({ length: 24 }, (_, h) => {
      const slotStart = new Date(day);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 3_600_000);
      const past = isSameDay(day, now)
        ? slotStart < new Date(now.getTime() - 60_000)
        : day < startOfDay(now);
      const blocking = reservations.find((r) => {
        const rStart = new Date(r.startAt);
        const rEnd = r.releasedEarlyAt ? new Date(r.releasedEarlyAt) : new Date(r.endAt);
        if (rEnd <= slotStart || rStart >= slotEnd) return false;
        return r.type === 'TOTAL' || r.room === room || type === 'TOTAL';
      });

      const inCooldown = myReservations.some((r) => {
        const rStart = new Date(r.startAt);
        const effEnd = r.releasedEarlyAt
          ? new Date(r.releasedEarlyAt)
          : new Date(r.endAt);
        const duration = effEnd.getTime() - rStart.getTime();
        if (duration <= 0) return false;
        const cdStart = effEnd;
        const cdEnd = new Date(effEnd.getTime() + duration);
        if (cdEnd <= slotStart || cdStart >= slotEnd) return false;
        return r.type === 'TOTAL' || type === 'TOTAL' || r.room === room;
      });

      return {
        hour: h,
        past,
        occupied: !!blocking,
        cooldown: inCooldown && !blocking,
        occupiedBy: blocking?.user.alias,
      };
    });
  }, [reservations, day, room, type, currentUserId]);

  const inRange = (h: number) => {
    if (selStart === null || selEnd === null) return false;
    const lo = Math.min(selStart, selEnd);
    const hi = Math.max(selStart, selEnd);
    return h >= lo && h <= hi;
  };

  const rangeValid = useMemo(() => {
    if (selStart === null || selEnd === null) return false;
    const lo = Math.min(selStart, selEnd);
    const hi = Math.max(selStart, selEnd);
    for (let h = lo; h <= hi; h++) {
      const s = hourStatus[h];
      if (s.past || s.occupied || s.cooldown) return false;
    }
    return true;
  }, [selStart, selEnd, hourStatus]);

  const onChipClick = (h: number) => {
    const s = hourStatus[h];
    if (s.past || s.occupied || s.cooldown) return;
    if (selStart === null || selEnd === null) {
      setSelStart(h);
      setSelEnd(h);
      return;
    }
    if (selStart === selEnd && selStart === h) {
      setSelStart(null);
      setSelEnd(null);
      return;
    }
    if (inRange(h) && selStart !== selEnd) {
      setSelStart(h);
      setSelEnd(h);
      return;
    }
    setSelEnd(h);
  };

  const reset = () => {
    setSelStart(null);
    setSelEnd(null);
    setError(null);
  };

  const submit = async () => {
    if (selStart === null || selEnd === null) return;
    setSubmitting(true);
    setError(null);
    const lo = Math.min(selStart, selEnd);
    const hi = Math.max(selStart, selEnd);
    const startAt = new Date(day);
    startAt.setHours(lo, 0, 0, 0);
    const endAt = new Date(day);
    endAt.setHours(hi + 1, 0, 0, 0);
    try {
      const r = await api.post<Reservation>('/reservations', {
        room,
        type,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
      onCreated(r);
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error ?? '';
      setError(ERROR_LABEL[code] ?? 'No se ha podido crear la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  const lo = selStart !== null && selEnd !== null ? Math.min(selStart, selEnd) : null;
  const hi = selStart !== null && selEnd !== null ? Math.max(selStart, selEnd) : null;
  const totalHours = lo !== null && hi !== null ? hi - lo + 1 : 0;

  const canGoPrevDay = day > startOfDay(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservar {ROOM_LABEL[room]}</DialogTitle>
          <DialogDescription>
            Selecciona el dia y las horas que quieres reservar.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
          Si reservas <strong>N horas</strong>, durante las <strong>N horas siguientes a que
          termine la reserva</strong> no podras volver a reservar la misma sala.
        </div>

        <div className="space-y-4">
          {/* Day selector */}
          <div className="flex items-center justify-between rounded-md border p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDay(new Date(day.getTime() - 86_400_000))}
              disabled={!canGoPrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize">{dayLabel(day)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDay(new Date(day.getTime() + 86_400_000))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={type === 'SOLO' ? 'default' : 'outline'}
                onClick={() => setType('SOLO')}
              >
                Solo esta sala
              </Button>
              <Button
                type="button"
                size="sm"
                variant={type === 'TOTAL' ? 'default' : 'outline'}
                onClick={() => setType('TOTAL')}
              >
                Toda la oficina
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horas disponibles</Label>
              {totalHours > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalHours}h seleccionada{totalHours === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {hourStatus.map((s) => {
                const selected = inRange(s.hour);
                const disabled = s.past || s.occupied || s.cooldown;
                return (
                  <button
                    key={s.hour}
                    type="button"
                    onClick={() => onChipClick(s.hour)}
                    disabled={disabled}
                    title={
                      s.occupied
                        ? `Ocupada por @${s.occupiedBy}`
                        : s.cooldown
                          ? 'En periodo de espera por tu reserva anterior'
                          : s.past
                            ? 'Ya pasada'
                            : 'Libre'
                    }
                    className={cn(
                      'h-12 rounded-md text-xs font-medium border transition-colors flex flex-col items-center justify-center px-1',
                      selected &&
                        !disabled &&
                        'bg-primary text-primary-foreground border-primary',
                      !selected &&
                        !disabled &&
                        'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
                      s.occupied &&
                        'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-300 cursor-not-allowed',
                      s.cooldown &&
                        !s.occupied &&
                        'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 cursor-not-allowed',
                      s.past &&
                        !s.occupied &&
                        !s.cooldown &&
                        'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="tabular-nums">
                      {s.hour.toString().padStart(2, '0')}:00
                    </span>
                    {s.occupied && (
                      <span className="text-[10px] truncate w-full text-center">
                        @{s.occupiedBy}
                      </span>
                    )}
                    {s.cooldown && !s.occupied && (
                      <span className="text-[10px] truncate w-full text-center">espera</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-800 border border-emerald-500" />
                Libre
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 dark:bg-rose-900 border border-rose-500" />
                Ocupada
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-700 border border-zinc-400" />
                Espera
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                Seleccionada
              </span>
            </div>
          </div>

          {lo !== null && hi !== null && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              {rangeValid ? (
                <>
                  Reservar de{' '}
                  <span className="font-semibold">
                    {lo.toString().padStart(2, '0')}:00
                  </span>{' '}
                  a{' '}
                  <span className="font-semibold">
                    {(hi + 1).toString().padStart(2, '0')}:00
                  </span>
                </>
              ) : (
                <span className="text-destructive">
                  El rango incluye horas no disponibles. Reduce la seleccion.
                </span>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          {(selStart !== null || selEnd !== null) && (
            <Button variant="ghost" onClick={reset} disabled={submitting}>
              Limpiar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !rangeValid || totalHours < 1 || totalHours > 24}
          >
            {submitting ? 'Reservando...' : 'Reservar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

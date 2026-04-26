import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { LogOut, Clock, MapPin, Calendar, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FloorPlan } from '@/components/FloorPlan';
import { api } from '@/api/client';
import type { Reservation, Room } from '@/api/types';
import { ROOM_LABEL } from '@/api/types';
import { useSessionStore } from '@/stores/session';
import { BookingDialog } from './BookingDialog';
import { HelpDialog } from './HelpDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const dayLabel = (d: Date) => {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Manana';
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

export const ReservationsPage = () => {
  const session = useSessionStore((s) => s.session);
  const logout = useSessionStore((s) => s.logout);
  const [bookingTarget, setBookingTarget] = useState<Room | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState<Reservation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reservation | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const from = startOfDay(new Date()).toISOString();
  const to = new Date(startOfDay(new Date()).getTime() + 7 * 86_400_000).toISOString();

  const { data, mutate } = useSWR<Reservation[]>(
    `/reservations?from=${from}&to=${to}`,
    (url: string) => api.get<Reservation[]>(url),
    { refreshInterval: 30_000 }
  );

  const upcoming = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return data
      .filter((r) => {
        const effEnd = r.releasedEarlyAt ? new Date(r.releasedEarlyAt) : new Date(r.endAt);
        return effEnd > now;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [data]);


  const RELEASE_ERROR: Record<string, string> = {
    not_found: 'Esta reserva ya no existe.',
    forbidden: 'No puedes liberar esta reserva.',
    already_released: 'Esta reserva ya estaba liberada.',
    already_ended: 'Esta reserva ya termino.',
  };

  const DELETE_ERROR: Record<string, string> = {
    not_found: 'Esta reserva ya no existe.',
    forbidden: 'No puedes eliminar esta reserva.',
    already_started: 'La reserva ya empezo. Usa "Liberar ahora" en su lugar.',
  };

  const doRelease = async () => {
    if (!confirmRelease) return;
    setActionPending(true);
    setActionError(null);
    try {
      await api.post(`/reservations/${confirmRelease.id}/release`);
      setConfirmRelease(null);
      mutate();
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error ?? '';
      setActionError(RELEASE_ERROR[code] ?? 'No se ha podido liberar la reserva.');
      mutate();
    } finally {
      setActionPending(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setActionPending(true);
    setActionError(null);
    try {
      await api.delete(`/reservations/${confirmDelete.id}`);
      setConfirmDelete(null);
      mutate();
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error ?? '';
      setActionError(DELETE_ERROR[code] ?? 'No se ha podido eliminar la reserva.');
      mutate();
    } finally {
      setActionPending(false);
    }
  };

  const openBookingFor = (room: Room) => {
    if (!session || session.role !== 'user') return;
    setBookingTarget(room);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-base sm:text-xl font-semibold truncate">Reservas Oficina</h1>
            {session?.role === 'user' && (
              <span className="text-xs sm:text-sm text-muted-foreground truncate">
                @{session.user.alias}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpOpen(true)}
              title="Ayuda"
            >
              <HelpCircle className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-4 sm:py-6 px-3 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          <Card className="p-3 sm:p-4">
            <FloorPlan
              reservations={data ?? []}
              currentUserId={session?.role === 'user' ? session.user.id : undefined}
              onRoomClick={
                session?.role === 'user' ? (room) => openBookingFor(room) : undefined
              }
              className="max-h-[60vh]"
            />
            {session?.role === 'user' && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Toca una sala para reservar
              </p>
            )}
          </Card>

          <Card className="self-start">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Proximas reservas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay reservas proximas.
                </p>
              )}
              {upcoming.map((r) => {
                const start = new Date(r.startAt);
                const end = new Date(r.endAt);
                const isMine =
                  session?.role === 'user' && r.user.id === session.user.id;
                const isActive =
                  start <= new Date() &&
                  new Date() < (r.releasedEarlyAt ? new Date(r.releasedEarlyAt) : end);
                const target =
                  r.type === 'TOTAL' ? 'Toda la oficina' : ROOM_LABEL[r.room];
                return (
                  <div
                    key={r.id}
                    className={cn(
                      'rounded-md border p-3 text-sm space-y-1 transition-colors',
                      isMine && 'border-primary/40 bg-primary/5',
                      !isMine && isActive && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">@{r.user.alias}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          En curso
                        </span>
                      )}
                      {isMine && !isActive && (
                        <span className="text-[10px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                          Tu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{target}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>
                        {dayLabel(start)} {formatTime(start)} - {formatTime(end)}
                      </span>
                    </div>
                    {isMine && isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setActionError(null);
                          setConfirmRelease(r);
                        }}
                      >
                        Liberar ahora
                      </Button>
                    )}
                    {isMine && !isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          setActionError(null);
                          setConfirmDelete(r);
                        }}
                      >
                        Eliminar reserva
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <Dialog open={!!confirmRelease} onOpenChange={(o) => !o && setConfirmRelease(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar reserva</DialogTitle>
            <DialogDescription>
              ¿Liberar tu reserva de{' '}
              <strong>
                {confirmRelease &&
                  (confirmRelease.type === 'TOTAL'
                    ? 'Toda la oficina'
                    : ROOM_LABEL[confirmRelease.room])}
              </strong>{' '}
              ahora? Se notificara al grupo y la sala quedara disponible.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRelease(null)}
              disabled={actionPending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doRelease} disabled={actionPending}>
              {actionPending ? 'Liberando...' : 'Liberar ahora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar reserva</DialogTitle>
            <DialogDescription>
              ¿Eliminar tu reserva de{' '}
              <strong>
                {confirmDelete &&
                  (confirmDelete.type === 'TOTAL'
                    ? 'Toda la oficina'
                    : ROOM_LABEL[confirmDelete.room])}
              </strong>
              ? Se notificara al grupo y se borrara.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={actionPending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={actionPending}>
              {actionPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bookingTarget && (
        <BookingDialog
          open={!!bookingTarget}
          onOpenChange={(open) => !open && setBookingTarget(null)}
          room={bookingTarget}
          reservations={data ?? []}
          currentUserId={session?.role === 'user' ? session.user.id : undefined}
          onCreated={() => {
            setBookingTarget(null);
            mutate();
          }}
        />
      )}
    </div>
  );
};

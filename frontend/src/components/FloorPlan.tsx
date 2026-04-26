import type { Reservation, Room } from '@/api/types';
import { ROOM_LABEL } from '@/api/types';
import { cn } from '@/lib/utils';

type Props = {
  reservations: Reservation[];
  currentUserId?: string;
  onRoomClick?: (room: Room) => void;
  className?: string;
};

type RoomStatus = {
  state: 'free' | 'occupied' | 'mine';
  alias?: string;
  type?: 'SOLO' | 'TOTAL';
};

const isActiveNow = (r: Reservation, now: Date): boolean => {
  const start = new Date(r.startAt);
  const effEnd = r.releasedEarlyAt ? new Date(r.releasedEarlyAt) : new Date(r.endAt);
  return start <= now && now < effEnd;
};

const getStatus = (
  reservations: Reservation[],
  room: Room,
  currentUserId?: string
): RoomStatus => {
  const now = new Date();
  const active = reservations.find(
    (r) => isActiveNow(r, now) && (r.type === 'TOTAL' || r.room === room)
  );
  if (!active) return { state: 'free' };
  if (currentUserId && active.user.id === currentUserId)
    return { state: 'mine', alias: active.user.alias, type: active.type };
  return { state: 'occupied', alias: active.user.alias, type: active.type };
};

const fillFor = (state: RoomStatus['state']) => {
  switch (state) {
    case 'free':
      return 'fill-emerald-100 dark:fill-emerald-950/40';
    case 'occupied':
      return 'fill-rose-300/80 dark:fill-rose-900/60';
    case 'mine':
      return 'fill-sky-200 dark:fill-sky-900/60';
  }
};

const strokeFor = (state: RoomStatus['state']) => {
  switch (state) {
    case 'free':
      return 'stroke-emerald-500/60';
    case 'occupied':
      return 'stroke-rose-600';
    case 'mine':
      return 'stroke-sky-600';
  }
};

const statusBadge = (s: RoomStatus) => {
  if (s.state === 'free') return { text: 'Libre', cls: 'fill-emerald-700 dark:fill-emerald-300' };
  if (s.state === 'mine')
    return {
      text: `@${s.alias}${s.type === 'TOTAL' ? ' · toda' : ''}`,
      cls: 'fill-sky-800 dark:fill-sky-300',
    };
  return {
    text: `@${s.alias}${s.type === 'TOTAL' ? ' · toda' : ''}`,
    cls: 'fill-rose-700 dark:fill-rose-300',
  };
};

export const FloorPlan = ({ reservations, currentUserId, onRoomClick, className }: Props) => {
  const salaEstar = getStatus(reservations, 'SALA_ESTAR', currentUserId);
  const salaOrden = getStatus(reservations, 'SALA_ORDENADORES', currentUserId);

  const estarBadge = statusBadge(salaEstar);
  const ordenBadge = statusBadge(salaOrden);

  return (
    <svg
      viewBox="0 0 540 720"
      className={cn('w-full h-auto select-none', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sala de ordenadores: full floor as the click target. The sala_estar and bano cards sit on top. */}
      <rect
        x="0"
        y="0"
        width="540"
        height="720"
        rx="14"
        className={cn(
          'transition-colors',
          fillFor(salaOrden.state),
          strokeFor(salaOrden.state),
          onRoomClick && 'cursor-pointer hover:brightness-95'
        )}
        strokeWidth="3"
        onClick={() => onRoomClick?.('SALA_ORDENADORES')}
      />

      {/* Sala de estar: top-right */}
      <rect
        x="240"
        y="0"
        width="300"
        height="370"
        rx="14"
        className={cn(
          'transition-colors',
          fillFor(salaEstar.state),
          strokeFor(salaEstar.state),
          onRoomClick && 'cursor-pointer hover:brightness-95'
        )}
        strokeWidth="3"
        onClick={() => onRoomClick?.('SALA_ESTAR')}
      />

      {/* Bano: decorative only, dashed muted border, not reservable */}
      <rect
        x="0"
        y="0"
        width="180"
        height="200"
        rx="10"
        strokeDasharray="6 5"
        className="fill-muted/40 stroke-muted-foreground/40"
        strokeWidth="2"
      />

      {/* Labels */}
      <g pointerEvents="none">
        {/* Bano */}
        <text
          x="90"
          y="105"
          textAnchor="middle"
          className="fill-muted-foreground font-medium"
          style={{ fontSize: 16 }}
        >
          Bano
        </text>

        {/* Sala de estar */}
        <text
          x="390"
          y="180"
          textAnchor="middle"
          className="fill-foreground font-bold"
          style={{ fontSize: 24 }}
        >
          {ROOM_LABEL.SALA_ESTAR}
        </text>
        <text
          x="390"
          y="210"
          textAnchor="middle"
          className={cn('font-semibold', estarBadge.cls)}
          style={{ fontSize: 17 }}
        >
          {estarBadge.text}
        </text>

        {/* Sala de ordenadores */}
        <text
          x="270"
          y="540"
          textAnchor="middle"
          className="fill-foreground font-bold"
          style={{ fontSize: 24 }}
        >
          {ROOM_LABEL.SALA_ORDENADORES}
        </text>
        <text
          x="270"
          y="570"
          textAnchor="middle"
          className={cn('font-semibold', ordenBadge.cls)}
          style={{ fontSize: 17 }}
        >
          {ordenBadge.text}
        </text>
      </g>
    </svg>
  );
};

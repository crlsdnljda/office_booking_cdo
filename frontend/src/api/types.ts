export type Room = 'SALA_ESTAR' | 'SALA_ORDENADORES';
export type ReservationType = 'SOLO' | 'TOTAL';

export const ROOM_LABEL: Record<Room, string> = {
  SALA_ESTAR: 'Sala de estar',
  SALA_ORDENADORES: 'Sala de ordenadores',
};

export type Reservation = {
  id: string;
  room: Room;
  type: ReservationType;
  startAt: string;
  endAt: string;
  releasedEarlyAt: string | null;
  user: { id: string; alias: string };
};

export type AdminUser = {
  id: string;
  alias: string;
  pin: string;
  createdAt: string;
};

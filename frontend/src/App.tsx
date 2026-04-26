import { useSessionStore } from '@/stores/session';
import { LoginPage } from '@/features/auth/LoginPage';
import { ReservationsPage } from '@/features/reservations/ReservationsPage';
import { AdminPage } from '@/features/admin/AdminPage';

export const App = () => {
  const session = useSessionStore((s) => s.session);
  if (!session) return <LoginPage />;
  if (session.role === 'admin') return <AdminPage />;
  return <ReservationsPage />;
};

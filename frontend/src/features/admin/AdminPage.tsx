import { useState } from 'react';
import useSWR from 'swr';
import { LogOut, Trash2, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/api/client';
import type { AdminUser } from '@/api/types';
import { useSessionStore } from '@/stores/session';

const ERROR_LABEL: Record<string, string> = {
  alias_taken: 'Ese alias ya existe.',
  pin_taken: 'Ese PIN ya esta en uso.',
};

type EditState =
  | { mode: 'create' }
  | { mode: 'edit'; user: AdminUser }
  | null;

export const AdminPage = () => {
  const logout = useSessionStore((s) => s.logout);
  const { data: users, mutate } = useSWR<AdminUser[]>('/users', (url: string) =>
    api.get<AdminUser[]>(url)
  );

  const [editState, setEditState] = useState<EditState>(null);
  const [alias, setAlias] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setAlias('');
    setPin('');
    setError(null);
    setEditState({ mode: 'create' });
  };

  const openEdit = (u: AdminUser) => {
    setAlias(u.alias);
    setPin(u.pin);
    setError(null);
    setEditState({ mode: 'edit', user: u });
  };

  const closeDialog = () => {
    setEditState(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editState.mode === 'create') {
        await api.post('/users', { alias, pin });
      } else {
        await api.patch(`/users/${editState.user.id}`, { alias, pin });
      }
      closeDialog();
      mutate();
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error ?? '';
      setError(
        ERROR_LABEL[code] ??
          (editState.mode === 'create'
            ? 'No se ha podido crear el usuario.'
            : 'No se ha podido actualizar el usuario.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      setConfirmDelete(null);
      mutate();
    } catch {
      setDeleteError('No se ha podido eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
          <h1 className="text-base sm:text-xl font-semibold">Panel admin</h1>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-4 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Usuarios</h2>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
          </Button>
        </div>

        <Card>
          <div className="grid grid-cols-[1fr_100px_90px] sm:grid-cols-[1fr_140px_110px] border-b bg-muted/50">
            <div className="p-3 text-xs font-medium text-muted-foreground">Alias</div>
            <div className="p-3 text-xs font-medium text-muted-foreground">PIN</div>
            <div></div>
          </div>
          {users?.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No hay usuarios todavia.
            </div>
          )}
          {users?.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_140px_110px] border-b last:border-0 items-center"
            >
              <div className="p-3 text-sm font-medium">@{u.alias}</div>
              <div className="p-3 text-sm font-mono">{u.pin}</div>
              <div className="p-2 flex gap-1 justify-end">
                <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(u)}
                  className="text-destructive hover:text-destructive"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </main>

      {/* Create / Edit dialog */}
      <Dialog open={!!editState} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editState?.mode === 'edit' ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Guardando...'
                  : editState?.mode === 'edit'
                    ? 'Guardar'
                    : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              Vas a eliminar a <span className="font-semibold">@{confirmDelete?.alias}</span>. Se
              borraran tambien sus reservas.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

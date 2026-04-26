import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const Swatch = ({ cls, label }: { cls: string; label: string }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className={`inline-block w-4 h-4 rounded border ${cls}`} />
    <span>{label}</span>
  </div>
);

export const HelpDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>¿Como funciona?</DialogTitle>
          <DialogDescription>
            Guia rapida para reservar las salas de la oficina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold">1. Reservar</h3>
            <p className="text-muted-foreground">
              Toca una de las dos salas en el plano (Sala de estar o Sala de
              ordenadores). Se abrira un panel con las 24 horas del dia. Selecciona
              las que quieres y pulsa <strong>Reservar</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Tipos de reserva</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong>Solo esta sala</strong>: bloquea unicamente la sala que
                elegiste.
              </li>
              <li>
                <strong>Toda la oficina</strong>: bloquea las dos salas en esas
                horas.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. Periodo de espera</h3>
            <p className="text-muted-foreground">
              Si reservas <strong>N horas</strong>, durante las <strong>N horas
              siguientes a que termine la reserva</strong> no podras volver a
              reservar la misma sala. Otros usuarios si pueden reservarla en ese
              periodo. La espera se acorta si liberas tu reserva antes de tiempo.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Liberar o cancelar</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                Si tu reserva esta <strong>en curso</strong> y ya no la necesitas,
                pulsa <strong>Liberar ahora</strong> en el panel "Proximas
                reservas".
              </li>
              <li>
                Si la reserva todavia <strong>no ha empezado</strong>, puedes
                eliminarla con el boton <strong>Eliminar reserva</strong>.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Notificaciones por WhatsApp</h3>
            <p className="text-muted-foreground">
              Al grupo de la oficina llegan automaticamente avisos de:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Reserva creada</li>
              <li>15 minutos antes de que termine una reserva</li>
              <li>Reserva liberada antes de tiempo</li>
              <li>Reserva cancelada</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Colores en el plano</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <Swatch
                cls="bg-emerald-100 dark:bg-emerald-950/40 border-emerald-500/60"
                label="Libre"
              />
              <Swatch
                cls="bg-rose-300/80 dark:bg-rose-900/60 border-rose-600"
                label="Ocupada por otro"
              />
              <Swatch
                cls="bg-sky-200 dark:bg-sky-900/60 border-sky-600"
                label="Tu reserva activa"
              />
              <Swatch
                cls="bg-muted/40 border-dashed border-muted-foreground/40"
                label="Bano (no reservable)"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Colores en los chips de horas</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <Swatch
                cls="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                label="Libre"
              />
              <Swatch
                cls="bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                label="Ocupada"
              />
              <Swatch
                cls="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
                label="En espera (tuya)"
              />
              <Swatch cls="bg-primary border-primary" label="Seleccionada" />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

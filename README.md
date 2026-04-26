# Reservas Oficina

App para reservar las salas de la oficina (Sala de estar y Sala de ordenadores).

## Stack

- **Backend**: Fastify + Prisma + PostgreSQL + JWT
- **Frontend**: React + Vite + Tailwind + shadcn-style (Radix UI)
- **Notificaciones**: Evolution API (WhatsApp)

## Funcionalidades

- Login con PIN unico (admin desde `.env`, usuarios desde DB)
- Sesion persistente en localStorage
- Reservas por bloques de 1h, max 24h
- Tipos: solo una sala o toda la oficina
- Cooldown: tras N horas reservadas, no puedes volver a la misma sala durante N horas
- Boton para liberar la reserva antes
- Panel admin para crear/borrar usuarios
- Notificaciones WhatsApp:
  - Confirmacion de reserva al usuario
  - Aviso 15 min antes del fin
  - Aviso al grupo cuando alguien libera antes

## Arrancar en local

### Requisitos

- Docker + Docker Compose

### Pasos

1. Copiar `.env.example` a `.env` en `backend/`:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Editar `backend/.env` y rellenar las claves de Evolution API:

   ```
   EVOLUTION_API_URL=https://tu-evolution-api.com
   EVOLUTION_API_KEY=tu_api_key
   EVOLUTION_INSTANCE_NAME=tu_instance
   EVOLUTION_GROUP_JID=120363xxxxxxxx@g.us
   ADMIN_PIN=el_pin_del_admin
   JWT_SECRET=cambia_esto_por_un_string_aleatorio_largo
   ```

3. Levantar todo:

   ```bash
   docker compose up -d --build
   ```

4. Aplicar migraciones / generar el schema (la primera vez):

   ```bash
   docker compose exec backend npx prisma db push
   ```

5. Abrir [http://localhost:8090](http://localhost:8090)

### Login

- **Admin**: introduce el `ADMIN_PIN` que pusiste en `.env`.
- **Usuarios**: el admin los crea desde el panel; cada uno tiene su PIN.

## Desarrollo sin Docker

Backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push   # contra una postgres local
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Vite proxa `/api` a `http://localhost:3001`.

## Estructura

```
office_booking/
  backend/
    prisma/schema.prisma
    src/
      server.ts
      shared/
      modules/
        auth/
        users/
        reservations/
        notifications/   # scheduler de avisos 15 min
  frontend/
    src/
      App.tsx
      components/ui/     # shadcn-style primitives
      features/
        auth/
        reservations/
        admin/
      api/
      stores/
      lib/
  docker-compose.yml
```

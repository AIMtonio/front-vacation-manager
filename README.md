# front-vacation-manager

Administración de vacaciones del equipo de arquitectura (Next.js 15 + Tailwind).

## Ejecutar

```bash
npm install
npm run dev
```

Abrir http://localhost:3000

- **/** – Calendario mensual dinámico; cada arquitecto tiene su color. Clic en un evento para ver fechas y backups; clic en un nombre de la leyenda para ocultarlo/mostrarlo.
- **/vacaciones** – Formulario para asignar vacaciones (arquitecto, rango de fechas, backups, notas) y listado con opción de eliminar.

## Datos

- **Arquitectos**: `data/architects.json` (`id`, `name`, `color` opcional). Edítalo en el repo para agregar o renombrar arquitectos; no cambies el `id` de uno que ya tenga vacaciones.
- **Vacaciones**:
  - Con `DATABASE_URL` (o `POSTGRES_URL`) definida → Postgres (Neon). La tabla `vacations` se crea sola en la primera petición.
  - Sin ella → `data/vacations.json` (solo desarrollo local; en Vercel el disco es de solo lectura).

### Configurar Postgres en Vercel

1. En el proyecto de Vercel: **Storage → Create Database → Neon (Postgres)** y conéctala al proyecto. Esto agrega `DATABASE_URL` a las variables de entorno.
2. Haz un redeploy.
3. (Opcional) Para usar la misma base en local, copia `.env.example` a `.env.local` y pega la cadena de conexión.

## Reglas de validación (servidor)

- Un arquitecto no puede ser su propio backup.
- Se requiere al menos un backup.
- La fecha de fin no puede ser anterior a la de inicio.
- Un arquitecto no puede tener dos periodos de vacaciones que se traslapen.
- Un backup no puede estar de vacaciones en esas mismas fechas.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/architects` | Lista de arquitectos |
| GET | `/api/vacations` | Lista de vacaciones |
| POST | `/api/vacations` | Crea vacaciones `{ architectId, startDate, endDate, backupIds[], notes? }` |
| DELETE | `/api/vacations/:id` | Elimina un registro |

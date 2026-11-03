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

## Base de datos local

Los datos viven en archivos JSON dentro de `data/`:

| Archivo | Contenido |
|---|---|
| `data/architects.json` | Catálogo de arquitectos (`id`, `name`, `color` opcional). Edítalo para agregar o renombrar arquitectos. |
| `data/vacations.json` | Vacaciones registradas (lo escribe la aplicación). |

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

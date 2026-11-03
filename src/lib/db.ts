import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Architect, NewVacation, Vacation } from "./types";

/**
 * "Base de datos" local basada en archivos JSON dentro de /data.
 * Suficiente para desarrollo y uso interno en un solo servidor.
 * Para producción se recomienda migrar a SQLite/Postgres (p. ej. con Prisma).
 */
const DATA_DIR = path.join(process.cwd(), "data");
const ARCHITECTS_FILE = path.join(DATA_DIR, "architects.json");
const VACATIONS_FILE = path.join(DATA_DIR, "vacations.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

// Serializa las escrituras para evitar condiciones de carrera entre peticiones.
let writeQueue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.catch(() => undefined);
  return run;
}

export function getArchitects(): Promise<Architect[]> {
  return readJson<Architect[]>(ARCHITECTS_FILE, []);
}

export function getVacations(): Promise<Vacation[]> {
  return readJson<Vacation[]>(VACATIONS_FILE, []);
}

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart <= bEnd && bStart <= aEnd;

export function createVacation(input: NewVacation): Promise<Vacation> {
  return withLock(async () => {
    const architects = await getArchitects();
    const vacations = await getVacations();
    const byId = new Map(architects.map((a) => [a.id, a]));

    const { architectId, startDate, endDate, notes } = input;
    const backupIds = Array.from(new Set(input.backupIds ?? []));

    if (!byId.has(architectId)) throw new ValidationError("Selecciona un arquitecto válido.");
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate))
      throw new ValidationError("Las fechas deben tener formato YYYY-MM-DD.");
    if (endDate < startDate)
      throw new ValidationError("La fecha de fin no puede ser anterior a la de inicio.");
    if (backupIds.length === 0) throw new ValidationError("Selecciona al menos un arquitecto de backup.");
    if (backupIds.includes(architectId))
      throw new ValidationError("Un arquitecto no puede dejarse a sí mismo como backup.");
    const unknown = backupIds.find((id) => !byId.has(id));
    if (unknown) throw new ValidationError("Uno de los backups no es un arquitecto válido.");

    const ownOverlap = vacations.find(
      (v) => v.architectId === architectId && overlaps(startDate, endDate, v.startDate, v.endDate),
    );
    if (ownOverlap)
      throw new ValidationError(
        `El arquitecto ya tiene vacaciones del ${ownOverlap.startDate} al ${ownOverlap.endDate}.`,
      );

    const busyBackup = backupIds.find((id) =>
      vacations.some((v) => v.architectId === id && overlaps(startDate, endDate, v.startDate, v.endDate)),
    );
    if (busyBackup)
      throw new ValidationError(
        `${byId.get(busyBackup)!.name} estará de vacaciones en esas fechas y no puede ser backup.`,
      );

    const vacation: Vacation = {
      id: randomUUID(),
      architectId,
      startDate,
      endDate,
      backupIds,
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await writeJson(VACATIONS_FILE, [...vacations, vacation]);
    return vacation;
  });
}

export function deleteVacation(id: string): Promise<boolean> {
  return withLock(async () => {
    const vacations = await getVacations();
    const next = vacations.filter((v) => v.id !== id);
    if (next.length === vacations.length) return false;
    await writeJson(VACATIONS_FILE, next);
    return true;
  });
}

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import type { Architect, NewVacation, Vacation } from "./types";

/**
 * Persistencia:
 * - Arquitectos: catálogo de solo lectura en data/architects.json (se edita en el repo).
 * - Vacaciones: Postgres (Neon) si existe DATABASE_URL; si no, data/vacations.json (solo desarrollo local,
 *   en Vercel el sistema de archivos es de solo lectura).
 */
const DATA_DIR = path.join(process.cwd(), "data");
const ARCHITECTS_FILE = path.join(DATA_DIR, "architects.json");
const VACATIONS_FILE = path.join(DATA_DIR, "vacations.json");

const DATABASE_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

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

interface VacationStore {
  list(): Promise<Vacation[]>;
  insert(v: Vacation): Promise<void>;
  remove(id: string): Promise<boolean>;
}

const jsonStore: VacationStore = {
  list: () => readJson<Vacation[]>(VACATIONS_FILE, []),
  insert: async (v) => writeJson(VACATIONS_FILE, [...(await jsonStore.list()), v]),
  remove: async (id) => {
    const vacations = await jsonStore.list();
    const next = vacations.filter((v) => v.id !== id);
    if (next.length === vacations.length) return false;
    await writeJson(VACATIONS_FILE, next);
    return true;
  },
};

function postgresStore(url: string): VacationStore {
  const sql = neon(url);
  let ready: Promise<unknown> | undefined;
  const ensureSchema = () =>
    (ready ??= sql`
      CREATE TABLE IF NOT EXISTS vacations (
        id           uuid PRIMARY KEY,
        architect_id text        NOT NULL,
        start_date   date        NOT NULL,
        end_date     date        NOT NULL,
        backup_ids   text[]      NOT NULL,
        notes        text,
        created_at   timestamptz NOT NULL DEFAULT now()
      )`.catch((err) => {
      ready = undefined;
      throw err;
    }));

  return {
    async list() {
      await ensureSchema();
      const rows = await sql`
        SELECT id, architect_id, start_date::text AS start_date, end_date::text AS end_date,
               backup_ids, notes, created_at
        FROM vacations ORDER BY start_date`;
      return rows.map((r) => ({
        id: r.id,
        architectId: r.architect_id,
        startDate: r.start_date,
        endDate: r.end_date,
        backupIds: r.backup_ids,
        notes: r.notes ?? undefined,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    },
    async insert(v) {
      await ensureSchema();
      await sql`
        INSERT INTO vacations (id, architect_id, start_date, end_date, backup_ids, notes, created_at)
        VALUES (${v.id}, ${v.architectId}, ${v.startDate}, ${v.endDate}, ${v.backupIds}, ${v.notes ?? null}, ${v.createdAt})`;
    },
    async remove(id) {
      await ensureSchema();
      const rows = await sql`DELETE FROM vacations WHERE id = ${id} RETURNING id`;
      return rows.length > 0;
    },
  };
}

const store: VacationStore = DATABASE_URL ? postgresStore(DATABASE_URL) : jsonStore;

export function getArchitects(): Promise<Architect[]> {
  return readJson<Architect[]>(ARCHITECTS_FILE, []);
}

export function getVacations(): Promise<Vacation[]> {
  return store.list();
}

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    await store.insert(vacation);
    return vacation;
  });
}

export function deleteVacation(id: string): Promise<boolean> {
  if (DATABASE_URL && !UUID_RE.test(id)) return Promise.resolve(false);
  return withLock(() => store.remove(id));
}

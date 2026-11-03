export interface Architect {
  id: string;
  name: string;
  /** Color hexadecimal usado en el calendario. Opcional: si no existe se asigna uno de la paleta. */
  color?: string;
}

export interface Vacation {
  id: string;
  architectId: string;
  /** Fecha en formato YYYY-MM-DD (inclusive) */
  startDate: string;
  /** Fecha en formato YYYY-MM-DD (inclusive) */
  endDate: string;
  backupIds: string[];
  notes?: string;
  createdAt: string;
}

export type NewVacation = Pick<Vacation, "architectId" | "startDate" | "endDate" | "backupIds" | "notes">;

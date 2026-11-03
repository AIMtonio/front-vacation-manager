"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Architect, Vacation } from "@/lib/types";
import { architectColor } from "@/lib/colors";
import { daysBetween, formatDate, toISODate } from "@/lib/dates";

interface Props {
  architects: Architect[];
  vacations: Vacation[];
}

export default function VacationManager({ architects, vacations }: Props) {
  const router = useRouter();
  const [architectId, setArchitectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [backupIds, setBackupIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    architects.forEach((a, i) => map.set(a.id, { name: a.name, color: architectColor(a, i) }));
    return map;
  }, [architects]);

  // El arquitecto seleccionado nunca aparece como opción de backup.
  const backupOptions = architects.filter((a) => a.id !== architectId);

  const onArchitectChange = (id: string) => {
    setArchitectId(id);
    setBackupIds((prev) => prev.filter((b) => b !== id));
  };

  const toggleBackup = (id: string) =>
    setBackupIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

  const reset = () => {
    setArchitectId("");
    setStartDate("");
    setEndDate("");
    setBackupIds([]);
    setNotes("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!architectId) return setError("Selecciona el arquitecto.");
    if (!startDate || !endDate) return setError("Selecciona la fecha de inicio y fin.");
    if (endDate < startDate) return setError("La fecha de fin no puede ser anterior a la de inicio.");
    if (backupIds.length === 0) return setError("Selecciona al menos un arquitecto de backup.");
    if (backupIds.includes(architectId)) return setError("Un arquitecto no puede dejarse a sí mismo como backup.");

    setSaving(true);
    try {
      const res = await fetch("/api/vacations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ architectId, startDate, endDate, backupIds, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar.");
        return;
      }
      setSuccess(`Vacaciones registradas para ${meta.get(architectId)?.name}.`);
      reset();
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (v: Vacation) => {
    if (!confirm(`¿Eliminar las vacaciones de ${meta.get(v.architectId)?.name}?`)) return;
    const res = await fetch(`/api/vacations/${v.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError("No se pudo eliminar el registro.");
  };

  const todayISO = toISODate(new Date());
  const sorted = [...vacations].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Asignar vacaciones</h2>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Arquitecto</span>
          <select value={architectId} onChange={(e) => onArchitectChange(e.target.value)} className="input">
            <option value="">— Selecciona —</option>
            {architects.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) setEndDate(e.target.value);
              }}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </label>
        </div>
        {startDate && endDate && endDate >= startDate && (
          <p className="-mt-2 text-xs text-slate-500">{daysBetween(startDate, endDate)} días naturales</p>
        )}

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1 font-medium text-slate-700">Arquitectos backup</legend>
          {!architectId ? (
            <p className="text-xs text-slate-400">Primero selecciona el arquitecto.</p>
          ) : (
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-slate-200 p-2">
              {backupOptions.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={backupIds.includes(a.id)}
                    onChange={() => toggleBackup(a.id)}
                  />
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: meta.get(a.id)?.color }} />
                  {a.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Notas (opcional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" />
        </label>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Guardando…" : "Registrar vacaciones"}
        </button>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-5 py-3 text-lg font-semibold text-slate-800">Vacaciones registradas</h2>
        {sorted.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Aún no hay vacaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Arquitecto</th>
                  <th className="px-4 py-2">Fechas</th>
                  <th className="px-4 py-2">Backup</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((v) => {
                  const m = meta.get(v.architectId);
                  const past = v.endDate < todayISO;
                  return (
                    <tr key={v.id} className={`border-t border-slate-100 ${past ? "text-slate-400" : ""}`}>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: m?.color }} />
                          {m?.name ?? "Desconocido"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {formatDate(v.startDate)} – {formatDate(v.endDate)}
                        <span className="ml-1 text-xs text-slate-400">({daysBetween(v.startDate, v.endDate)} d)</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {v.backupIds.map((id) => (
                            <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                              {meta.get(id)?.name ?? id}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => onDelete(v)} className="text-xs text-red-600 hover:underline">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Architect, Vacation } from "@/lib/types";
import { architectColor } from "@/lib/colors";
import { WEEKDAYS, daysBetween, formatDate, monthGrid, toISODate } from "@/lib/dates";

interface Props {
  architects: Architect[];
  vacations: Vacation[];
}

export default function VacationCalendar({ architects, vacations }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Vacation | null>(null);

  const meta = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    architects.forEach((a, i) => map.set(a.id, { name: a.name, color: architectColor(a, i) }));
    return map;
  }, [architects]);

  const days = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const visible = vacations.filter((v) => !hidden.has(v.architectId));
  const todayISO = toISODate(today);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold capitalize text-slate-800">{monthLabel}</h2>
          <div className="flex gap-1">
            <button onClick={() => move(-1)} className="btn-secondary" aria-label="Mes anterior">‹</button>
            <button
              onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
              className="btn-secondary"
            >
              Hoy
            </button>
            <button onClick={() => move(1)} className="btn-secondary" aria-label="Mes siguiente">›</button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-medium uppercase text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = toISODate(day);
            const inMonth = day.getMonth() === cursor.month;
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const events = visible.filter((v) => v.startDate <= iso && iso <= v.endDate);
            return (
              <div
                key={iso}
                className={`min-h-24 border-b border-r border-slate-100 p-1 text-xs ${
                  inMonth ? (weekend ? "bg-slate-50" : "bg-white") : "bg-slate-50/60 text-slate-400"
                }`}
              >
                <div
                  className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full ${
                    iso === todayISO ? "bg-slate-900 font-semibold text-white" : ""
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="flex flex-col gap-0.5">
                  {events.map((v) => {
                    const m = meta.get(v.architectId);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelected(v)}
                        title={m?.name}
                        className={`truncate rounded px-1.5 py-0.5 text-left font-medium text-white ${
                          inMonth ? "" : "opacity-50"
                        }`}
                        style={{ backgroundColor: m?.color ?? "#64748b" }}
                      >
                        {m?.name ?? "Desconocido"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="flex flex-col gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Arquitectos</h3>
          <ul className="flex flex-col gap-1.5">
            {architects.map((a) => {
              const m = meta.get(a.id)!;
              const off = hidden.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    onClick={() => toggle(a.id)}
                    className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-slate-50 ${
                      off ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: off ? "#cbd5e1" : m.color }}
                    />
                    {a.name}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Clic en un nombre para ocultarlo/mostrarlo.</p>
        </div>

        {selected && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: meta.get(selected.architectId)?.color }}
                />
                {meta.get(selected.architectId)?.name}
              </h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                ✕
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Fechas</dt>
                <dd>
                  {formatDate(selected.startDate)} – {formatDate(selected.endDate)} (
                  {daysBetween(selected.startDate, selected.endDate)} días)
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Backup</dt>
                <dd className="flex flex-wrap gap-1">
                  {selected.backupIds.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                      {meta.get(id)?.name ?? id}
                    </span>
                  ))}
                </dd>
              </div>
              {selected.notes && (
                <div>
                  <dt className="text-xs text-slate-500">Notas</dt>
                  <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}

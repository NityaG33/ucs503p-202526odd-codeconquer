import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ---- Types ----
/**
 * Category meanings:
 * - used: food consumed/used for meals
 * - cookedLeft: cooked food remaining at end of day
 * - inventoryLeft: raw/uncooked inventory remaining in pantry/fridge
 */
const CATEGORIES = [
  { key: "used", label: "Food Used" },
  { key: "cookedLeft", label: "Cooked Food Left" },
  { key: "inventoryLeft", label: "Inventory Left" },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const STORAGE_KEY = "fa_weeks_v1";
// Colors used for Pie chart segments
const PIE_COLORS = ["#6366f1", "#22c55e", "#fbbf24"];

// ---- Helpers ----
function startOfWeekISO(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function fmtDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---- Data Shapes ----
export type Entry = {
  id: string;
  dayIndex: number; // 0..6 (Mon..Sun)
  item: string;
  category: typeof CATEGORIES[number]["key"];
  qty: number;
};

export type Week = {
  id: string;
  weekStartISO: string; // ISO string for Monday 00:00:00
  entries: Entry[];
};

// Compute per-day rollups and week totals
function analyzeWeek(week: Week) {
  const perDay: Record<number, { used: number; cookedLeft: number; inventoryLeft: number }> = {} as any;
  const totals = { used: 0, cookedLeft: 0, inventoryLeft: 0 };

  for (let i = 0; i < 7; i++) perDay[i] = { used: 0, cookedLeft: 0, inventoryLeft: 0 };

  for (const e of week.entries) {
    perDay[e.dayIndex][e.category] += e.qty;
    (totals as any)[e.category] += e.qty;
  }

  const daySeries = Array.from({ length: 7 }, (_, i) => ({
    day: DAYS[i],
    ...perDay[i],
  }));

  const totalSeries = [
    { name: "Food Used", value: totals.used },
    { name: "Cooked Food Left", value: totals.cookedLeft },
    { name: "Inventory Left", value: totals.inventoryLeft },
  ];

  return { perDay, daySeries, totals, totalSeries };
}

function pctChange(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return 100; // from 0 to something
  return ((curr - prev) / prev) * 100;
}

// ---- Main App ----
export default function FoodAnalyzerApp() {
  const [weeks, setWeeks] = useState<Week[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Current working week (draft)
  const initialWeek: Week = useMemo(() => {
    const wStart = startOfWeekISO();
    return {
      id: uid(),
      weekStartISO: wStart.toISOString(),
      entries: [],
    };
  }, []);

  const [draftWeek, setDraftWeek] = useState<Week>(initialWeek);

  // UI nav
  const [tab, setTab] = useState<"input" | "analysis" | "history">("input");

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
  }, [weeks]);

  // Derived
  const draftAnalysis = useMemo(() => analyzeWeek(draftWeek), [draftWeek]);

  // Compare latest saved week (if any) to draft
  const latestSaved = weeks[0]; // keep newest first
  const latestAnalysis = latestSaved ? analyzeWeek(latestSaved) : null;

  function addEntry(partial?: Partial<Entry>) {
    setDraftWeek((w) => ({
      ...w,
      entries: [
        ...w.entries,
        {
          id: uid(),
          dayIndex: 0,
          item: "",
          category: "used",
          qty: 0,
          ...partial,
        },
      ],
    }));
  }

  function updateEntry(id: string, patch: Partial<Entry>) {
    setDraftWeek((w) => ({
      ...w,
      entries: w.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function removeEntry(id: string) {
    setDraftWeek((w) => ({ ...w, entries: w.entries.filter((e) => e.id !== id) }));
  }

  function clearDraft() {
    setDraftWeek((w) => ({ ...w, entries: [] }));
  }

  function finalizeWeek() {
    if (draftWeek.entries.length === 0) {
      alert("Please add at least one entry before saving the week.");
      return;
    }
    const newWeek = {
      ...draftWeek,
      id: uid(),
      weekStartISO: startOfWeekISO().toISOString(),
    };
    setWeeks((prev) => [newWeek, ...prev]);
    // start a fresh draft for the same calendar week (or next as needed)
    setDraftWeek({ id: uid(), weekStartISO: startOfWeekISO().toISOString(), entries: [] });
    setTab("analysis");
  }

  function deleteWeek(id: string) {
    if (!confirm("Delete this week's saved analysis?")) return;
    setWeeks((prev) => prev.filter((w) => w.id !== id));
  }

  // Comparison: draft vs latest saved
  const comparison = useMemo(() => {
    if (!latestAnalysis) return null;
    const curr = draftAnalysis.totals;
    const prev = latestAnalysis.totals;
    return {
      used: pctChange(curr.used, prev.used),
      cookedLeft: pctChange(curr.cookedLeft, prev.cookedLeft),
      inventoryLeft: pctChange(curr.inventoryLeft, prev.inventoryLeft),
    };
  }, [draftAnalysis, latestAnalysis]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-neutral-900 text-white grid place-items-center font-bold">FA</div>
            <div>
              <h1 className="text-lg font-semibold">Food Analyzer</h1>
              <p className="text-xs text-neutral-500">Track usage • leftovers • inventory — weekly</p>
            </div>
          </div>
          <nav className="flex gap-2">
            <TabButton active={tab === "input"} onClick={() => setTab("input")}>
              Weekly Input
            </TabButton>
            <TabButton active={tab === "analysis"} onClick={() => setTab("analysis")}>
              Analysis
            </TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>
              History
            </TabButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
        {/* Draft banner */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">Current week starting</p>
            <h2 className="font-medium">
              {fmtDateShort(new Date(draftWeek.weekStartISO))} – {fmtDateShort(new Date(new Date(draftWeek.weekStartISO).getTime() + 6 * 86400000))}
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={finalizeWeek} className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition">
              Save Week
            </button>
            <button onClick={clearDraft} className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 transition">
              Clear Draft
            </button>
          </div>
        </section>

        {tab === "input" && (
          <InputTab
            draftWeek={draftWeek}
            addEntry={addEntry}
            updateEntry={updateEntry}
            removeEntry={removeEntry}
          />
        )}

        {tab === "analysis" && (
          <AnalysisTab
            week={draftWeek}
            compWeek={latestSaved}
          />
        )}

        {tab === "history" && (
          <HistoryTab weeks={weeks} onDelete={deleteWeek} />
        )}
      </main>

      <footer className="py-8 text-center text-xs text-neutral-400">
        Built with ❤ — Data is stored locally in your browser (no server needed)
      </footer>
    </div>
  );
}

// ---- Subcomponents ----
function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-sm transition border " +
        (active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-100")
      }
    >
      {children}
    </button>
  );
}

function InputTab({
  draftWeek,
  addEntry,
  updateEntry,
  removeEntry,
}: {
  draftWeek: Week;
  addEntry: (p?: Partial<Entry>) => void;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  removeEntry: (id: string) => void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add items for each day</h3>
        <button
          onClick={() => addEntry()}
          className="px-3 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-sm"
        >
          + Add Item
        </button>
      </div>

      {/* Per-day quick add */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {DAYS.map((d, i) => (
          <button
            key={d}
            onClick={() => addEntry({ dayIndex: i })}
            className="w-full py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-sm"
          >
            + {d}
          </button>
        ))}
      </div>

      {/* Entries table */}
      <div className="overflow-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">Day</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Quantity</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {draftWeek.entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  No items yet. Use "+ Add Item" or the day shortcuts above.
                </td>
              </tr>
            )}
            {draftWeek.entries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">
                  <select
                    value={e.dayIndex}
                    onChange={(ev) => updateEntry(e.id, { dayIndex: Number(ev.target.value) })}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1 bg-white"
                  >
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={e.item}
                    onChange={(ev) => updateEntry(e.id, { item: ev.target.value })}
                    placeholder="e.g., Rice, Dal, Veg Curry"
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={e.category}
                    onChange={(ev) => updateEntry(e.id, { category: ev.target.value as Entry["category"] })}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={e.qty}
                    onChange={(ev) => updateEntry(e.id, { qty: Number(ev.target.value) })}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick totals for visibility */}
      <TotalsStrip week={draftWeek} />
    </section>
  );
}

function TotalsStrip({ week }: { week: Week }) {
  const { totals } = useMemo(() => analyzeWeek(week), [week]);
  const items = [
    { label: "Food Used", value: totals.used },
    { label: "Cooked Left", value: totals.cookedLeft },
    { label: "Inventory Left", value: totals.inventoryLeft },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">{it.label}</p>
          <p className="text-2xl font-semibold mt-1">{Number(it.value.toFixed(2))}</p>
        </div>
      ))}
    </div>
  );
}

function AnalysisTab({ week, compWeek }: { week: Week; compWeek?: Week }) {
  const analysis = useMemo(() => analyzeWeek(week), [week]);
  const comp = compWeek ? analyzeWeek(compWeek) : null;

  const comparison = comp
    ? [
        {
          name: "Food Used",
          current: analysis.totals.used,
          previous: comp.totals.used,
          pct: pctChange(analysis.totals.used, comp.totals.used),
        },
        {
          name: "Cooked Left",
          current: analysis.totals.cookedLeft,
          previous: comp.totals.cookedLeft,
          pct: pctChange(analysis.totals.cookedLeft, comp.totals.cookedLeft),
        },
        {
          name: "Inventory Left",
          current: analysis.totals.inventoryLeft,
          previous: comp.totals.inventoryLeft,
          pct: pctChange(analysis.totals.inventoryLeft, comp.totals.inventoryLeft),
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-day stacked bars */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Per-day breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.daySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="used" name="Food Used" stackId="a" />
                <Bar dataKey="cookedLeft" name="Cooked Left" stackId="a" />
                <Bar dataKey="inventoryLeft" name="Inventory Left" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Totals pie */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h3 className="font-semibold mb-2">Totals (current week)</h3>
          <div className="h-64 grid place-items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={analysis.totalSeries} nameKey="name" outerRadius={90} label>
                  {analysis.totalSeries.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison vs last saved week */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Compare with last saved week</h3>
          {!comp && <span className="text-xs text-neutral-500">No saved weeks yet</span>}
        </div>
        {comp && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {comparison.map((row) => (
              <div key={row.name} className="rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500">{row.name}</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-xs text-neutral-500">Current</p>
                    <p className="text-xl font-semibold">{Number(row.current.toFixed(2))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Previous</p>
                    <p className="text-xl font-semibold">{Number(row.previous.toFixed(2))}</p>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <span
                    className={
                      "px-2 py-1 rounded-lg " +
                      (row.pct >= 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700")
                    }
                  >
                    {row.pct >= 0 ? "▲" : "▼"} {Math.abs(row.pct).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryTab({ weeks, onDelete }: { weeks: Week[]; onDelete: (id: string) => void }) {
  return (
    <section className="space-y-4">
      {weeks.length === 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-neutral-500">
          No saved weeks yet. Go to <span className="font-medium">Weekly Input</span> to add entries, then Save Week.
        </div>
      )}

      {weeks.map((w) => {
        const analysis = analyzeWeek(w);
        const ws = new Date(w.weekStartISO);
        const we = new Date(ws.getTime() + 6 * 86400000);
        return (
          <div key={w.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Week: {fmtDateShort(ws)} – {fmtDateShort(we)}</h3>
                <p className="text-xs text-neutral-500">{w.entries.length} items</p>
              </div>
              <button
                onClick={() => onDelete(w.id)}
                className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-sm"
              >
                Delete Week
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500">Food Used</p>
                <p className="text-2xl font-semibold mt-1">{Number(analysis.totals.used.toFixed(2))}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500">Cooked Left</p>
                <p className="text-2xl font-semibold mt-1">{Number(analysis.totals.cookedLeft.toFixed(2))}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-4">
                <p className="text-sm text-neutral-500">Inventory Left</p>
                <p className="text-2xl font-semibold mt-1">{Number(analysis.totals.inventoryLeft.toFixed(2))}</p>
              </div>
            </div>

            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.daySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="used" name="Food Used" />
                  <Bar dataKey="cookedLeft" name="Cooked Left" />
                  <Bar dataKey="inventoryLeft" name="Inventory Left" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </section>
  );
}

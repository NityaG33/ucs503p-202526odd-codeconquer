import { useEffect, useState } from "react";
import Sidebar from "../components/sidebar";
import api from "../api";
import PieChartComponent from "../components/piechartcomponent";
import LineChartComponent from "../components/linechartcomponent";

const TOTAL = 900; // fixed total students

export default function StaffDashboard() {
  const [mealId, setMealId] = useState(1);
  const [summary, setSummary] = useState({ noCount: 0, yesCount: TOTAL });
  const [pie, setPie] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // 1) summary
      const s = await api.get(`/api/summary?mealId=${mealId}`);
      const no = Number(s.data?.noCount ?? 0);
      const yes = Number(s.data?.yesCount ?? (TOTAL - no));
      setSummary({ noCount: no, yesCount: yes });

      // 2) wastage pie
      const p = await api.get(`/api/wastage/pie?mealId=${mealId}`);
      const data = (p.data?.data || []).map((r) => ({
        name: r.NAME ?? r.name,
        value: Number(r.KG ?? r.kg ?? 0),
      }));
      setPie(data);

      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
      // keep it quiet in UI; staff can hit Refresh
      // alert("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Initial + when meal changes
  useEffect(() => {
    load();
  }, [mealId]);

  // Auto-refresh every 10 seconds (adjust if needed)
  useEffect(() => {
    const id = setInterval(() => load(), 10_000);
    return () => clearInterval(id);
  }, [mealId]);

  // Refresh when tab/window regains focus
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mealId]);

  // Attendance prediction chart (simple synthetic line)
  const line = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    predicted: Math.max(0, summary.yesCount + (i % 3 === 0 ? 20 : -15)),
    actual: Math.max(0, summary.yesCount + (i % 4 === 0 ? -10 : 10)),
  }));

  // Download NO list as CSV or Excel
  const downloadNoList = (type = "csv") => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const url =
      type === "xlsx"
        ? `${base}/api/no/export-xlsx?mealId=${mealId}`
        : `${base}/api/no/export?mealId=${mealId}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <Sidebar />
      <div className="main">
        <div className="wrap">
          <div className="heading">Staff Dashboard</div>

          <div className="kpi">
            <div className="item">
              <div className="label">Meal ID</div>
              <div className="value">
                <select
                  value={mealId}
                  onChange={(e) => setMealId(Number(e.target.value))}
                >
                  <option value={1}>1 (Lunch)</option>
                  <option value={2}>2 (Dinner)</option>
                </select>
              </div>
            </div>

            <div className="item">
              <div className="label">Yes Count</div>
              <div className="value">{summary.yesCount}</div>
            </div>

            <div className="item">
              <div className="label">No Count</div>
              <div className="value">{summary.noCount}</div>
            </div>

            <div className="item">
              <div className="label">Total Students</div>
              <div className="value">{TOTAL}</div>
            </div>

            <div className="item">
              <div className="label">Actions</div>
              <div className="value">
                <button
                  onClick={load}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    cursor: "pointer",
                  }}
                  disabled={loading}
                  title="Refresh now"
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          <p style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            Last updated:{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
          </p>

          <div className="row row2" style={{ marginTop: 16 }}>
            <div className="card">
              <div className="heading">Attendance Prediction (Next 7 Days)</div>
              <LineChartComponent points={line} />
            </div>
            <div id="wastage" className="card">
              <div className="heading">Food Wastage Analysis</div>
              <PieChartComponent data={pie} />
            </div>
          </div>

          {/* Download NO list */}
          <div className="card" style={{ marginTop: 20, textAlign: "center" }}>
            <div className="heading">Download NO Responses</div>
            <p>
              Export the students who opted <b>NO</b> for the selected meal.
            </p>
            <button
              onClick={() => downloadNoList("csv")}
              style={{
                margin: "8px",
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Download CSV
            </button>
            <button
              onClick={() => downloadNoList("xlsx")}
              style={{
                margin: "8px",
                padding: "8px 16px",
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Download Excel
            </button>
          </div>

          {loading && <div className="hint">Loading…</div>}
        </div>
      </div>
    </>
  );
}

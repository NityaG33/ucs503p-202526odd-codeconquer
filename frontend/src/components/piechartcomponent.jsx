import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PieChartComponent({ data = [] }) {
  // If empty, render zeroed default categories so the widget still appears
  const fallback = [
    { name: "Bread Crumbs", value: 0 },
    { name: "Leftover Gravy", value: 0 },
    { name: "Uneaten Rice", value: 0 },
    { name: "Vegetable Scraps", value: 0 },
  ];
  const chartData = (data && data.length ? data : fallback).map((d) => ({
    name: d.name ?? d.NAME,
    value: Number(d.value ?? d.KG ?? d.kg ?? 0),
  }));

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

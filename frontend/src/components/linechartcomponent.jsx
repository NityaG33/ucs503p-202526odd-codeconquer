import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export default function LineChartComponent({ points = [] }) {
  // Ensure we always render something
  const data = points.length ? points : [
    { day: "Mon", predicted: 0, actual: 0 },
    { day: "Tue", predicted: 0, actual: 0 },
    { day: "Wed", predicted: 0, actual: 0 },
    { day: "Thu", predicted: 0, actual: 0 },
    { day: "Fri", predicted: 0, actual: 0 },
    { day: "Sat", predicted: 0, actual: 0 },
    { day: "Sun", predicted: 0, actual: 0 },
  ];

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="actual" dot={false} />
          <Line type="monotone" dataKey="predicted" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

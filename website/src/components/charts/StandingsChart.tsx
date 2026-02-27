"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DriverStanding } from "@/types";

interface Props {
  data: DriverStanding[];
  rounds: number[];
}

export default function StandingsChart({ data, rounds }: Props) {
  if (!data.length || !rounds.length) return null;

  // Build chart data: one entry per round
  const chartData = rounds.map((r, i) => {
    const point: Record<string, number | string> = { round: `R${r}` };
    data.forEach((d) => {
      point[d.driver] = d.pointsHistory[i] ?? 0;
    });
    return point;
  });

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" />
          <XAxis
            dataKey="round"
            stroke="#8B8FA3"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#8B8FA3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1D2B",
              border: "1px solid #2A2E3F",
              borderRadius: "8px",
              color: "#F0F0F0",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#8B8FA3", fontWeight: "bold" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#F0F0F0" }}
          />
          {data.map((d) => (
            <Line
              key={d.driver}
              type="monotone"
              dataKey={d.driver}
              stroke={d.teamColor}
              strokeWidth={2.5}
              dot={{ fill: d.teamColor, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

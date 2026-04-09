import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { ForecastSeries } from "@/lib/changes-api"

const FORECAST_BASE: ForecastSeries = {
  months: [
    "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Oct 26",
    "Nov 26", "Dec 26", "Jan 27", "Feb 27", "Mar 27", "Apr 27",
  ],
  values: [
    85_000, 85_000, 85_000, 85_000, 85_000, 85_000,
    85_000, 85_000, 85_000, 85_000, 85_000, 85_000,
  ],
}

interface ImpactChartProps {
  forecastAfter: ForecastSeries | null
  isApproved: boolean
  compact?: boolean
}

export function ImpactChart({ forecastAfter, isApproved, compact }: ImpactChartProps) {
  if (!forecastAfter) return null

  const data = FORECAST_BASE.months.map((month, i) => ({
    month,
    before: FORECAST_BASE.values[i],
    after: forecastAfter.values[i],
  }))

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line type="monotone" dataKey="before" stroke="#d4d4d8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="after" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray={isApproved ? "0" : "4 3"} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          tickLine={false}
          axisLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
          domain={["dataMin - 5000", "dataMax + 5000"]}
        />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          formatter={(value) =>
            new Intl.NumberFormat("de-DE", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(Number(value))
          }
        />
        <Line
          type="monotone"
          dataKey="before"
          name="Current"
          stroke="#d4d4d8"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="after"
          name="After change"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray={isApproved ? "0" : "5 5"}
          dot={false}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

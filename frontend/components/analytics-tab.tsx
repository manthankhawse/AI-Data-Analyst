"use client"
import { useParams } from "next/navigation";
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Treemap,
  Tooltip,
  Legend,
} from "recharts"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

interface Project {
  id: string
  name: string
  description: string
  dataset: any
  status: string
}

interface AnalyticsTabProps {
  project: Project
}

function normalizeRow(row: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    let val = row[key]
    // coerce string numbers to numbers
    if (typeof val === "string" && !isNaN(Number(val))) {
      val = Number(val)
    }
    out[key.toLowerCase()] = val
  }
  return out
}

export function AnalyticsTab({ project }: AnalyticsTabProps) {
  const params = useParams(); // returns an object
  const projectId = params.id; // same name as in your route segment
  const [charts, setCharts] = useState<any[]>([])
  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`http://localhost:8080/charts/${projectId}`)
      const json = await res.json();
      console.log("this is the fetched data ", json);
      // normalize data keys + numbers
      const normalized = json.charts.map((c: any) => ({
        ...c,
        data: c.data.map(normalizeRow),
      }))
      console.log(normalized)
      setCharts(normalized)
    }
    fetchData()
  }, [projectId])

  return (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {charts.map((chart, idx) => (
      <Card key={idx} className="transition-all duration-200 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{chart.description}</CardTitle>
          <CardDescription className="text-sm">{chart.query}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              {chart.chart.type === "BarChart" && (
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.chart.x.toLowerCase()} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey={chart.chart.y.toLowerCase()} fill="var(--chart-1)" />
                </BarChart>
              )}

              {chart.chart.type === "LineChart" && (
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.chart.x.toLowerCase()} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey={chart.chart.y.toLowerCase()} stroke="var(--chart-1)" />
                </LineChart>
              )}

              {chart.chart.type === "PieChart" && (
                <PieChart>
                  <Pie
                    data={chart.data}
                    dataKey={chart.chart.y.toLowerCase()}
                    nameKey={chart.chart.x.toLowerCase()}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {chart.data.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              )}

              {chart.chart.type === "AreaChart" && (
                <AreaChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.chart.x.toLowerCase()} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey={chart.chart.y.toLowerCase()}
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              )}

              {chart.chart.type === "ScatterChart" && (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.chart.x.toLowerCase()} />
                  <YAxis dataKey={chart.chart.y.toLowerCase()} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Scatter data={chart.data} fill="var(--chart-1)" />
                </ScatterChart>
              )}

              {chart.chart.type === "Treemap" && (
                <Treemap
                  data={chart.data}
                  dataKey={chart.chart.y.toLowerCase()}
                  nameKey={chart.chart.x.toLowerCase()}
                  stroke="#fff"
                  fill="var(--chart-1)"
                />
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    ))}
  </div>
)

}

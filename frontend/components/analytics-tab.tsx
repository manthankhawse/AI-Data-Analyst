// "use client"
// import { useParams } from "next/navigation";
// import { useEffect, useState } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
// import {
//   BarChart,
//   Bar,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   Area,
//   AreaChart,
//   LineChart,
//   Line,
//   ScatterChart,
//   Scatter,
//   Treemap,
//   Tooltip,
//   Legend,
// } from "recharts"

// const COLORS = [
//   "hsl(var(--chart-1))",
//   "hsl(var(--chart-2))",
//   "hsl(var(--chart-3))",
//   "hsl(var(--chart-4))",
//   "hsl(var(--chart-5))",
// ]

// interface Project {
//   id: string
//   name: string
//   description: string
//   dataset: any
//   status: string
// }

// interface AnalyticsTabProps {
//   project: Project
// }

// function normalizeRow(row: Record<string, any>) {
//   const out: Record<string, any> = {}
//   for (const key of Object.keys(row)) {
//     let val = row[key]
//     // coerce string numbers to numbers
//     if (typeof val === "string" && !isNaN(Number(val))) {
//       val = Number(val)
//     }
//     out[key.toLowerCase()] = val
//   }
//   return out
// }

// export function AnalyticsTab({ project }: AnalyticsTabProps) {
//   const params = useParams(); // returns an object
//   const projectId = params.id; // same name as in your route segment
//   const [charts, setCharts] = useState<any[]>([])
//   useEffect(() => {
//     async function fetchData() {
//       const res = await fetch(`http://localhost:8080/charts/${projectId}`)
//       const json = await res.json();
//       console.log("this is the fetched data ", json);
//       // normalize data keys + numbers
//       const normalized = json.charts.map((c: any) => ({
//         ...c,
//         data: c.data.map(normalizeRow),
//       }))
//       console.log(normalized)
//       setCharts(normalized)
//     }
//     fetchData()
//   }, [projectId])

//   return (
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//     {charts.map((chart, idx) => (
//       <Card key={idx} className="transition-all duration-200 hover:shadow-lg">
//         <CardHeader>
//           <CardTitle className="text-lg sm:text-xl">{chart.description}</CardTitle>
//           <CardDescription className="text-sm">{chart.query}</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
//             <ResponsiveContainer width="100%" height="100%">
//               {chart.chart.type === "BarChart" && (
//                 <BarChart data={chart.data}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey={chart.chart.x.toLowerCase()} />
//                   <YAxis />
//                   <ChartTooltip content={<ChartTooltipContent />} />
//                   <Bar dataKey={chart.chart.y.toLowerCase()} fill="var(--chart-1)" />
//                 </BarChart>
//               )}

//               {chart.chart.type === "LineChart" && (
//                 <LineChart data={chart.data}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey={chart.chart.x.toLowerCase()} />
//                   <YAxis />
//                   <ChartTooltip content={<ChartTooltipContent />} />
//                   <Line type="monotone" dataKey={chart.chart.y.toLowerCase()} stroke="var(--chart-1)" />
//                 </LineChart>
//               )}

//               {chart.chart.type === "PieChart" && (
//                 <PieChart>
//                   <Pie
//                     data={chart.data}
//                     dataKey={chart.chart.y.toLowerCase()}
//                     nameKey={chart.chart.x.toLowerCase()}
//                     cx="50%"
//                     cy="50%"
//                     outerRadius={80}
//                     label
//                   >
//                     {chart.data.map((_: any, index: number) => (
//                       <Cell key={index} fill={COLORS[index % COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <ChartTooltip content={<ChartTooltipContent />} />
//                 </PieChart>
//               )}

//               {chart.chart.type === "AreaChart" && (
//                 <AreaChart data={chart.data}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey={chart.chart.x.toLowerCase()} />
//                   <YAxis />
//                   <ChartTooltip content={<ChartTooltipContent />} />
//                   <Area
//                     type="monotone"
//                     dataKey={chart.chart.y.toLowerCase()}
//                     stroke="var(--chart-1)"
//                     fill="var(--chart-1)"
//                     fillOpacity={0.3}
//                   />
//                 </AreaChart>
//               )}

//               {chart.chart.type === "ScatterChart" && (
//                 <ScatterChart>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey={chart.chart.x.toLowerCase()} />
//                   <YAxis dataKey={chart.chart.y.toLowerCase()} />
//                   <ChartTooltip content={<ChartTooltipContent />} />
//                   <Scatter data={chart.data} fill="var(--chart-1)" />
//                 </ScatterChart>
//               )}

//               {chart.chart.type === "Treemap" && (
//                 <Treemap
//                   data={chart.data}
//                   dataKey={chart.chart.y.toLowerCase()}
//                   nameKey={chart.chart.x.toLowerCase()}
//                   stroke="#fff"
//                   fill="var(--chart-1)"
//                 />
//               )}
//             </ResponsiveContainer>
//           </ChartContainer>
//         </CardContent>
//       </Card>
//     ))}
//   </div>
// )

// }


"use client"
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
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

interface Chart {
  description: string
  query: string
  chart: {
    type: string
    x: string
    y: string
  }
  data: Record<string, any>[]
}

// Skeleton component for individual chart cards
function ChartSkeleton() {
  return (
    <Card className="transition-all duration-200">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Memoized chart component to prevent unnecessary re-renders
const ChartComponent = ({ chart }: { chart: Chart }) => {
  const chartElement = useMemo(() => {
    const commonProps = {
      data: chart.data,
    }

    switch (chart.chart.type) {
      case "BarChart":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.chart.x.toLowerCase()} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={chart.chart.y.toLowerCase()} fill="var(--chart-1)" />
          </BarChart>
        )

      case "LineChart":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.chart.x.toLowerCase()} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey={chart.chart.y.toLowerCase()} stroke="var(--chart-1)" />
          </LineChart>
        )

      case "PieChart":
        return (
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
              {chart.data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        )

      case "AreaChart":
        return (
          <AreaChart {...commonProps}>
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
        )

      case "ScatterChart":
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.chart.x.toLowerCase()} />
            <YAxis dataKey={chart.chart.y.toLowerCase()} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Scatter data={chart.data} fill="var(--chart-1)" />
          </ScatterChart>
        )

      case "Treemap":
        return (
          <Treemap
            data={chart.data}
            dataKey={chart.chart.y.toLowerCase()}
            nameKey={chart.chart.x.toLowerCase()}
            stroke="#fff"
            fill="var(--chart-1)"
          />
        )

      default:
        return <div>Unsupported chart type</div>
    }
  }, [chart])

  return (
    <ChartContainer config={{}} className="h-[250px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        {chartElement}
      </ResponsiveContainer>
    </ChartContainer>
  )
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
  const params = useParams()
  const projectId = params.id
  const [charts, setCharts] = useState<Chart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const res = await fetch(`http://localhost:8080/charts/${projectId}`, {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`Failed to fetch charts: ${res.status} ${res.statusText}`)
      }
      
      const json = await res.json()
      console.log("Fetched data:", json)
      
      // Normalize data keys + numbers with error handling
      const normalized = json.charts?.map((c: any) => ({
        ...c,
        data: Array.isArray(c.data) ? c.data.map(normalizeRow) : [],
      })) || []
      
      console.log("Normalized data:", normalized)
      setCharts(normalized)
    } catch (err) {
      console.error("Error fetching charts:", err)
      if (err instanceof Error) {
        setError(err.name === 'AbortError' ? 'Request timed out' : err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Memoize the skeleton array to prevent recreation on every render
  const skeletonArray = useMemo(() => Array(4).fill(null), [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {loading ? (
        // Show skeletons while loading
        skeletonArray.map((_, idx) => <ChartSkeleton key={idx} />)
      ) : charts.length === 0 ? (
        // Show empty state
        <div className="col-span-full flex items-center justify-center h-64">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No charts available for this project</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Show actual charts
        charts.map((chart, idx) => (
          <Card key={`${chart.description}-${idx}`} className="transition-all duration-200 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{chart.description}</CardTitle>
              <CardDescription className="text-sm">{chart.query}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartComponent chart={chart} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
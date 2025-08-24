"use client"

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
} from "recharts"

// Mock analytics data
const salesByMonth = [
  { month: "Jan", sales: 45000, target: 40000 },
  { month: "Feb", sales: 52000, target: 45000 },
  { month: "Mar", sales: 48000, target: 50000 },
  { month: "Apr", sales: 61000, target: 55000 },
  { month: "May", sales: 55000, target: 60000 },
  { month: "Jun", sales: 67000, target: 65000 },
]

const salesByRegion = [
  { region: "North America", sales: 180000, percentage: 35 },
  { region: "Europe", sales: 140000, percentage: 27 },
  { region: "Asia Pacific", sales: 120000, percentage: 23 },
  { region: "Latin America", sales: 80000, percentage: 15 },
]

const productPerformance = [
  { product: "Product A", revenue: 85000, units: 1200, margin: 0.35 },
  { product: "Product B", revenue: 72000, units: 980, margin: 0.42 },
  { product: "Product C", revenue: 68000, units: 850, margin: 0.28 },
  { product: "Product D", revenue: 54000, units: 720, margin: 0.38 },
  { product: "Product E", revenue: 41000, units: 560, margin: 0.31 },
]

const dailyTrend = [
  { date: "Jan 1", value: 2400 },
  { date: "Jan 2", value: 1398 },
  { date: "Jan 3", value: 9800 },
  { date: "Jan 4", value: 3908 },
  { date: "Jan 5", value: 4800 },
  { date: "Jan 6", value: 3800 },
  { date: "Jan 7", value: 4300 },
]

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

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

export function AnalyticsTab({ project }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-gradient-primary">$520,000</div>
            <p className="text-xs text-muted-foreground">+12.5% from last quarter</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">4,310</div>
            <p className="text-xs text-muted-foreground">+8.2% from last quarter</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">$120.65</div>
            <p className="text-xs text-muted-foreground">+3.8% from last quarter</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">3.24%</div>
            <p className="text-xs text-muted-foreground">+0.4% from last quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Sales vs Target</CardTitle>
            <CardDescription className="text-sm">Monthly sales performance compared to targets</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color: "hsl(var(--chart-1))",
                },
                target: {
                  label: "Target",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[250px] sm:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" />
                  <Bar dataKey="target" fill="var(--color-target)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Regional Distribution */}
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Sales by Region</CardTitle>
            <CardDescription className="text-sm">Revenue distribution across different regions</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[250px] sm:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByRegion}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sales"
                    label={({ region, percentage }) => `${region} (${percentage}%)`}
                  >
                    {salesByRegion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Product Performance */}
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Product Performance</CardTitle>
            <CardDescription className="text-sm">Revenue and units sold by product</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-1))",
                },
                units: {
                  label: "Units",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[250px] sm:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="product" type="category" width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Daily Trend</CardTitle>
            <CardDescription className="text-sm">Daily sales activity over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Sales",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[250px] sm:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    fill="var(--color-value)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Detailed Analytics</CardTitle>
          <CardDescription className="text-sm">Comprehensive breakdown of key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-right p-2 font-medium">Revenue</th>
                  <th className="text-right p-2 font-medium hidden sm:table-cell">Units Sold</th>
                  <th className="text-right p-2 font-medium hidden md:table-cell">Margin</th>
                  <th className="text-right p-2 font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                {productPerformance.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-2 font-medium">{product.product}</td>
                    <td className="p-2 text-right">${product.revenue.toLocaleString()}</td>
                    <td className="p-2 text-right hidden sm:table-cell">{product.units.toLocaleString()}</td>
                    <td className="p-2 text-right hidden md:table-cell">{(product.margin * 100).toFixed(1)}%</td>
                    <td className="p-2 text-right text-green-600">+{(Math.random() * 20).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

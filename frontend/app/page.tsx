import { DashboardHeader } from "@/components/dashboard-header"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Mock data for projects
const mockProjects = [
  {
    id: "1",
    name: "Sales Analytics Q4",
    lastUpdated: "2024-01-15",
    stats: {
      records: 15420,
      charts: 8,
      insights: 12,
    },
    status: "active",
  },
  {
    id: "2",
    name: "Customer Behavior Study",
    lastUpdated: "2024-01-12",
    stats: {
      records: 8750,
      charts: 5,
      insights: 7,
    },
    status: "active",
  },
  {
    id: "3",
    name: "Marketing Campaign ROI",
    lastUpdated: "2024-01-10",
    stats: {
      records: 3200,
      charts: 12,
      insights: 15,
    },
    status: "completed",
  },
  {
    id: "4",
    name: "Product Performance Metrics",
    lastUpdated: "2024-01-08",
    stats: {
      records: 22100,
      charts: 6,
      insights: 9,
    },
    status: "active",
  },
  {
    id: "5",
    name: "User Engagement Analysis",
    lastUpdated: "2024-01-05",
    stats: {
      records: 45600,
      charts: 10,
      insights: 18,
    },
    status: "active",
  },
  {
    id: "6",
    name: "Financial Forecasting",
    lastUpdated: "2024-01-03",
    stats: {
      records: 1850,
      charts: 4,
      insights: 6,
    },
    status: "draft",
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-gradient-primary mb-2">
            Data Analysis Dashboard
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Analyze, visualize, and gain insights from your data projects
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Button>
          <Button variant="outline">Import Dataset</Button>
          <Button variant="outline" className="hidden sm:inline-flex bg-transparent">
            View Templates
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mockProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Empty State for when no projects exist */}
        {mockProjects.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Get started by creating your first data analysis project
            </p>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

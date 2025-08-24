import { ProjectHeader } from "@/components/project-header"
import { ProjectTabs } from "@/components/project-tabs"
import { AnalyticsTab } from "@/components/analytics-tab"
import { ChatTab } from "@/components/chat-tab"

// Mock project data
const mockProject = {
  id: "1",
  name: "Sales Analytics Q4",
  description: "Comprehensive analysis of Q4 sales performance across all regions and product categories",
  dataset: {
    name: "sales_data_q4_2024.csv",
    size: "2.4 MB",
    records: 15420,
    columns: 12,
    lastUpdated: "2024-01-15T10:30:00Z",
  },
  status: "active",
}

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <ProjectHeader project={mockProject} />

      <div className="container mx-auto px-6 py-6">
        <ProjectTabs defaultTab="analytics">
          <AnalyticsTab project={mockProject} />
          <ChatTab project={mockProject} />
        </ProjectTabs>
      </div>
    </div>
  )
}

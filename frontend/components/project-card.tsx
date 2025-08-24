"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Calendar, BarChart3, Database, Lightbulb, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ProjectStats {
  records: number
  charts: number
  insights: number
}

interface Project {
  id: string
  name: string
  lastUpdated: string
  stats: ProjectStats
  status: "active" | "completed" | "draft"
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {

  console.log(project);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-accent/10 text-accent-foreground border-accent/20"
      case "completed":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      case "draft":
        return "bg-muted text-muted-foreground border-border"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border/50 hover:border-accent/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-lg mb-2 group-hover:text-accent transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Updated {project.lastUpdated}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 mx-auto mb-2">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm font-medium">{project.stats.records}</div>
            <div className="text-xs text-muted-foreground">Records</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <div className="text-sm font-medium">{project.stats.charts}</div>
            <div className="text-xs text-muted-foreground">Charts</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 mx-auto mb-2">
              <Lightbulb className="w-4 h-4 text-accent" />
            </div>
            <div className="text-sm font-medium">{project.stats.insights}</div>
            <div className="text-xs text-muted-foreground">Insights</div>
          </div>
        </div>

        <Button
          className="w-full mt-4 bg-gradient-primary hover:opacity-90 transition-opacity opacity-0 group-hover:opacity-100"
          size="sm"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Project
        </Button>
      </CardContent>
    </Card>
  )
}

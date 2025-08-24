"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Download, RefreshCw, Share, MoreHorizontal, Database, Calendar, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface Dataset {
  name: string
  size: string
  records: number
  columns: number
  lastUpdated: string
}

interface Project {
  id: string
  name: string
  description: string
  dataset: Dataset
  status: string
}

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="shrink-0">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold truncate">{project.name}</h1>
                <Badge className="bg-accent/10 text-accent-foreground border-accent/20 shrink-0">
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base line-clamp-2">{project.description}</p>

              {/* Dataset Info - Responsive Layout */}
              <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-6 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{project.dataset.name}</span>
                  <span className="text-muted-foreground">({project.dataset.size})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{project.dataset.records.toLocaleString()} records</span>
                  <span className="text-muted-foreground">• {project.dataset.columns} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate">Updated {formatDate(project.dataset.lastUpdated)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Project</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Archive</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile/Tablet Actions */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="space-y-3 mt-6">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>

                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>

                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Share className="w-4 h-4 mr-2" />
                    Share Project
                  </Button>

                  <hr className="my-4" />

                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    Edit Project
                  </Button>

                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    Duplicate Project
                  </Button>

                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    Archive Project
                  </Button>

                  <Button variant="destructive" className="w-full justify-start">
                    Delete Project
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}

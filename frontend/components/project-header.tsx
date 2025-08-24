"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Download, RefreshCw, Share, MoreHorizontal, Database, Calendar, FileText, BarChart2 } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

interface Dataset {
  name: string
  size: string
  records: number
  columns: number
  lastUpdated: string
}

interface ProjectMetadata {
  name : string
  projectId: string
  tableName: string
  numRows: number
  numCharts: number
}

interface Project {
  id: string
  name: string
  description: string
  dataset: Dataset
  status: string
}

export function ProjectHeader({ project }: { project: Project }) {
  const router = useRouter()
  const pathname = usePathname()
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null)

  const projectIdFromUrl = pathname.split("/").pop() // assumes URL ends with projectId

  useEffect(() => {
    if (!projectIdFromUrl) return

    async function fetchMetadata() {
      try {
        const res = await fetch(`http://localhost:8080/charts/${projectIdFromUrl}`)
        if (!res.ok) throw new Error("Failed to fetch project metadata")
        const data = await res.json()
        console.log("fetched data in header ", data);
        setMetadata({
          name: data.projectName,
          projectId: data.projectId,
          tableName: data.tableName,
          numRows: data.charts?.[0]?.data.length || 0, // approximate total rows for first chart
          numCharts: data.charts?.length || 0
        })
      } catch (err) {
        console.error("❌ Error fetching metadata:", err)
      }
    }

    fetchMetadata()
  }, [projectIdFromUrl])

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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold truncate">{metadata? metadata.name : "Project Name"}</h1>
              </div>
              {/* Dataset Info */}
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

              {/* Project Metadata */}
              {metadata && (
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Project ID:</span> {metadata.projectId}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Table Name:</span> {metadata.tableName}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Rows:</span> {metadata.numRows.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart2 className="w-4 h-4 text-muted-foreground" />
                    <span>{metadata.numCharts} charts</span>
                  </div>
                </div>
              )}
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

          {/* Mobile Actions */}
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

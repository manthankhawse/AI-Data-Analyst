"use client"
import { DashboardHeader } from "@/components/dashboard-header"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react" 
import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import Link from "next/link"

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)   // 👈 New state

  // Form state
  const [projectName, setProjectName] = useState("")
  const [tableName, setTableName] = useState("")
  const [file, setFile] = useState<File | null>(null)

  // Fetch all projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("http://localhost:8080/projects")
        const data = await res.json()
        const formatted = data.map((p: any) => {
          const totalRows = p.tables.reduce((acc: number, t: any) => acc + (t.numRows || 0), 0)
          const totalCharts = p.tables.reduce((acc: number, t: any) => acc + (t.charts?.length || 0), 0)
          return {
            id: p.projectId,
            name: p.name,
            lastUpdated: new Date().toISOString().split("T")[0],
            stats: {
              records: totalRows,
              charts: totalCharts,
              insights: Math.floor(totalCharts * 1.5),
            },
          }
        })
        setProjects(formatted)
      } catch (err) {
        console.error("❌ Error fetching projects:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Create Project
  const handleCreateProject = async () => {
    if (!projectName) return alert("Please enter a project name")

    const projectId = uuidv4()
    const formData = new FormData()
    formData.append("projectName", projectName)
    if (file) formData.append("file", file)

    try {
      setCreating(true)
      const res = await fetch(`http://localhost:8080/upload/${projectId}/${tableName}`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Failed to create project")

      const msg = await res.json()

      // Refresh projects
      const newProject = {
        id: projectId,
        name: projectName,
        stats : {
          records: msg.table.numRows,
          charts: 0, 
          insights: 0
        },
        lastUpdated: new Date().toISOString().split("T")[0],
      }
      setProjects([...projects, newProject])
      setOpen(false)
      setProjectName("")
      setTableName("")
      setFile(null)
    } catch (err) {
      console.error("❌ Error creating project:", err)
    }finally{
      setCreating(false)
    }
  }

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
          <Button className="bg-gradient-primary hover:opacity-90 transition-opacity" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <Link href={`/project/${project.id}`}>
            <ProjectCard key={project.id} project={project} />
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {projects.length === 0 && !loading && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
              Get started by creating your first data analysis project
            </p>
            <Button className="bg-gradient-primary hover:opacity-90 transition-opacity" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <Input
              placeholder="Table Name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
            />
            <Input
              type="file"
              accept=".csv,.json,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button 
              className="bg-gradient-primary flex items-center gap-2"
              onClick={handleCreateProject}
              disabled={creating}  // 👈 prevent double click
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />  {/* 👈 spinning loader */}
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

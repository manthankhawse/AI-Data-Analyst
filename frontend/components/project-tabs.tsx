"use client"

import type React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, MessageSquare } from "lucide-react"

interface ProjectTabsProps {
  children: React.ReactNode[]
  defaultTab?: string
}

export function ProjectTabs({ children, defaultTab = "analytics" }: ProjectTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
        <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs sm:text-sm">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Analytics & Visualizations</span>
          <span className="sm:hidden">Analytics</span>
        </TabsTrigger>
        <TabsTrigger value="chat" className="flex items-center gap-2 text-xs sm:text-sm">
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Chat With Data</span>
          <span className="sm:hidden">Chat</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6">
        {children[0]}
      </TabsContent>

      <TabsContent value="chat" className="space-y-6">
        {children[1]}
      </TabsContent>
    </Tabs>
  )
}

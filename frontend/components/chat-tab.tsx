"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Send, BarChart3, FileText, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  hasChart?: boolean
  chartData?: any
  chartType?: "bar" | "pie" | "line"
  showChart?: boolean
}

interface Project {
  id: string
  name: string
  description: string
  dataset: any
  status: string
}

interface ChatTabProps {
  project: Project
}

// Mock chart data for different queries
const mockChartData = {
  sales: [
    { month: "Jan", value: 45000 },
    { month: "Feb", value: 52000 },
    { month: "Mar", value: 48000 },
    { month: "Apr", value: 61000 },
    { month: "May", value: 55000 },
    { month: "Jun", value: 67000 },
  ],
  regions: [
    { name: "North America", value: 35, count: 180000 },
    { name: "Europe", value: 27, count: 140000 },
    { name: "Asia Pacific", value: 23, count: 120000 },
    { name: "Latin America", value: 15, count: 80000 },
  ],
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"]

export function ChatTab({ project }: ChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your data analysis assistant. I can help you explore and understand your dataset. Try asking me questions like:\n\n• What are the top performing products?\n• Show me sales trends over time\n• Which regions have the highest revenue?\n• What's the average order value?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateMockResponse = (query: string): Omit<Message, "id" | "timestamp"> => {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes("sales") && lowerQuery.includes("trend")) {
      return {
        type: "assistant",
        content:
          "Here's the sales trend analysis for your dataset. I can see a general upward trend with some seasonal variations. June shows the highest sales at $67,000, while March had a slight dip to $48,000.",
        hasChart: true,
        chartData: mockChartData.sales,
        chartType: "bar",
        showChart: true,
      }
    }

    if (lowerQuery.includes("region") || lowerQuery.includes("geographic")) {
      return {
        type: "assistant",
        content:
          "Based on your data, North America leads with 35% of total sales ($180,000), followed by Europe at 27% ($140,000). Asia Pacific contributes 23% ($120,000), and Latin America accounts for 15% ($80,000).",
        hasChart: true,
        chartData: mockChartData.regions,
        chartType: "pie",
        showChart: true,
      }
    }

    if (lowerQuery.includes("average") || lowerQuery.includes("mean")) {
      return {
        type: "assistant",
        content:
          "Here are the key averages from your dataset:\n\n• Average Order Value: $120.65\n• Average Monthly Sales: $54,667\n• Average Customer Lifetime Value: $485.30\n• Average Products per Order: 2.4",
      }
    }

    if (lowerQuery.includes("top") || lowerQuery.includes("best") || lowerQuery.includes("highest")) {
      return {
        type: "assistant",
        content:
          "Top performing metrics from your analysis:\n\n• Highest Revenue Month: June ($67,000)\n• Best Converting Region: North America (3.8%)\n• Top Product Category: Electronics (42% of sales)\n• Peak Sales Day: Fridays (avg $8,200)",
      }
    }

    // Default response
    return {
      type: "assistant",
      content:
        "I understand you're asking about your dataset. Based on the current data, I can provide insights about sales performance, regional distribution, product analytics, and customer behavior. Could you be more specific about what aspect you'd like to explore?",
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI thinking time
    setTimeout(() => {
      const response = generateMockResponse(inputValue)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        timestamp: new Date(),
        ...response,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const toggleVisualization = (messageId: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, showChart: !msg.showChart } : msg)))
  }

  const renderChart = (message: Message) => {
    if (!message.chartData || !message.showChart) return null

    if (message.chartType === "bar") {
      return (
        <ChartContainer
          config={{
            value: {
              label: "Sales",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[250px] mt-3"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={message.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )
    }

    if (message.chartType === "pie") {
      return (
        <ChartContainer
          config={{
            value: {
              label: "Revenue",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[250px] mt-3"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={message.chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name} (${value}%)`}
              >
                {message.chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      )
    }

    return null
  }

  return (
    <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-300px)] flex flex-col">
      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Sparkles className="w-5 h-5 text-accent" />
            Chat With Your Data
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                    message.type === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                  {message.hasChart && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVisualization(message.id)}
                          className="h-8 px-2 text-xs"
                        >
                          {message.showChart ? (
                            <>
                              <FileText className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Show Text</span>
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">Show Chart</span>
                            </>
                          )}
                        </Button>
                        <Badge variant="secondary" className="text-xs">
                          Interactive
                        </Badge>
                      </div>
                      {renderChart(message)}
                    </div>
                  )}

                  {message.type === "assistant" && (
                    <div className="flex items-center gap-1 sm:gap-2 mt-3 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-6 px-1 sm:px-2 text-xs">
                        <Copy className="w-3 h-3 sm:mr-1" />
                        <span className="hidden sm:inline">Copy</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1 sm:px-2 text-xs">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-1 sm:px-2 text-xs">
                        <ThumbsDown className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything about your data..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isTyping}
              className="text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-primary hover:opacity-90 transition-opacity shrink-0"
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Questions - Responsive Layout */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Show me sales trends over time")}
              disabled={isTyping}
              className="text-xs"
            >
              <span className="hidden sm:inline">Sales Trends</span>
              <span className="sm:hidden">Trends</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Which regions perform best?")}
              disabled={isTyping}
              className="text-xs"
            >
              <span className="hidden sm:inline">Regional Analysis</span>
              <span className="sm:hidden">Regions</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("What's the average order value?")}
              disabled={isTyping}
              className="text-xs"
            >
              <span className="hidden sm:inline">Average Metrics</span>
              <span className="sm:hidden">Averages</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Show top performing products")}
              disabled={isTyping}
              className="text-xs"
            >
              <span className="hidden sm:inline">Top Products</span>
              <span className="sm:hidden">Products</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

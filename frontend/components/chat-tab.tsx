"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, ThumbsUp, ThumbsDown, Send, Sparkles } from "lucide-react"
import { useParams } from "next/navigation"

interface Message {
  id: string
  type: "user" | "assistant"
  content?: string
  rows?: Record<string, any>[]
  generatedSQL?: string
  explanation?: string
  timestamp: Date
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

const ROWS_PER_PAGE = 5

export function ChatTab({ project }: ChatTabProps) {
  const params = useParams()
  const projectId = params.id
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your data analysis assistant. I can help you explore and understand your dataset. Try asking me questions related to the dataset.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [pagination, setPagination] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // default language
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      handleSendMessage();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  


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


   


    try {
      const res = await fetch(`http://localhost:8080/project/${projectId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      })
      const data = await res.json()

      let parsedRows: Record<string, any>[] | undefined
      let generatedSQL: string | undefined
      let explanation: string | undefined
      let content: string | undefined

      if (data.decision === "SQL") {
        try {
          const parsed = JSON.parse(data.assistant)
          parsedRows = parsed.rows
          generatedSQL = parsed.generatedSQL
          explanation = parsed.naturalLanguage || ""
          content = "Here's the SQL query result:"
        } catch (e) {
          console.error("Failed to parse SQL assistant JSON:", e)
          content = "Error parsing SQL response."
        }
      } else {
        content = data.assistant
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content,
        rows: parsedRows,
        generatedSQL,
        explanation,
        timestamp: new Date(),
      }

      if (assistantMessage.rows) {
        setPagination((prev) => ({ ...prev, [assistantMessage.id]: 0 }))
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error(err)
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: "There was an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsTyping(false)
    }

  }

  const changePage = (msgId: string, delta: number, totalRows: number) => {
    setPagination((prev) => {
      const current = prev[msgId] || 0
      const maxPage = Math.floor((totalRows - 1) / ROWS_PER_PAGE)
      const nextPage = Math.min(Math.max(current + delta, 0), maxPage)
      return { ...prev, [msgId]: nextPage }
    })
  }

  const renderTable = (message: Message) => {
    if (!message.rows?.length) return null
    const page = pagination[message.id] || 0
    const start = page * ROWS_PER_PAGE
    const end = start + ROWS_PER_PAGE
    const pageRows = message.rows.slice(start, end)
    const columns = Object.keys(message.rows[0])

    return (
      <div className="mt-2 overflow-auto border rounded-md border-border max-h-72">
        {/* Show generated SQL */}
        {message.generatedSQL && (
          <div className="bg-muted/20 p-2 rounded mb-2 font-mono text-xs text-muted-foreground">
            <strong>SQL Query:</strong>
            <pre className="whitespace-pre-wrap">{message.generatedSQL}</pre>
          </div>
        )}
        {/* Show explanation */}
        {message.explanation && (
          <div className="bg-muted/10 p-2 rounded mb-2 text-sm text-muted-foreground">
            <strong>Explanation:</strong> {message.explanation}
          </div>
        )}

        {/* Paginated table */}
        <table className="w-full table-auto text-sm border-collapse">
          <thead className="bg-muted sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-2 py-1 text-left border-b border-border">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-muted/50" : ""}>
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1 border-b border-border">
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {message.rows.length > ROWS_PER_PAGE && (
          <div className="flex justify-between p-2 items-center">
            <Button
              size="sm"
              disabled={page === 0}
              onClick={() => changePage(message.id, -1, message.rows.length)}
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {page + 1} / {Math.ceil(message.rows.length / ROWS_PER_PAGE)}
            </span>
            <Button
              size="sm"
              disabled={end >= message.rows.length}
              onClick={() => changePage(message.id, 1, message.rows.length)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-300px)] flex flex-col">
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
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${message.type === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted"
                    }`}
                >
                  {message.content && <div className="whitespace-pre-wrap text-sm">{message.content}</div>}
                  {renderTable(message)}
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
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

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
              variant={isListening ? "destructive" : "outline"}
              size="sm"
              onClick={isListening ? stopListening : startListening}
            >
              {isListening ? "🎙️ Listening..." : "🎤 Voice"}
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-primary hover:opacity-90 transition-opacity shrink-0"
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

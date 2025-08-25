import express from "express";
import mongoose from "mongoose";
import { Pool } from "pg";
import dotenv from "dotenv";

// LangChain + LangGraph
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

app.use(cors());

// ---------------------------
// PostgreSQL connection
// ---------------------------
const pool = new Pool({
  connectionString: "postgresql://myuser:mypassword@localhost:5432/mydb",
});

// ---------------------------
// MongoDB connection
// ---------------------------
await mongoose.connect(
  "mongodb://mongo_user:mongo_pass@localhost:27017/csv_metadata?authSource=admin"
);
console.log("✅ Connected to MongoDB");

// Table metadata + chat history collections
const TableMeta = mongoose.model(
  "TableMeta",
  new mongoose.Schema({
    projectId: String,
    tableName: String,
    projectName: String,
    schema: [{ columnName: String, type: String }],
    charts: Array,
  }),
  "tablemetas"
);

const ChatHistory = mongoose.model(
  "ChatHistory",
  new mongoose.Schema({
    projectId: String,
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
      },
    ],
  }),
  "chatHistory"
);

// ---------------------------
// LangGraph setup for SQL queries
// ---------------------------
const StateSchema = z.object({
  projectId: z.string(),
  tableName: z.string(),
  query: z.string(),
  meta: z.any().optional(),
  schemaDescription: z.string().optional(),
  sql: z.string().optional(),
  result: z.any().optional(),
  response: z.any().optional(),
});

const graph = new StateGraph({
  channels: {
    projectId: { schema: StateSchema.shape.projectId },
    tableName: { schema: StateSchema.shape.tableName },
    query: { schema: StateSchema.shape.query },
    meta: { schema: StateSchema.shape.meta.optional() },
    schemaDescription: { schema: StateSchema.shape.schemaDescription.optional() },
    sql: { schema: StateSchema.shape.sql.optional() },
    result: { schema: StateSchema.shape.result.optional() },
    response: { schema: StateSchema.shape.response.optional() },
  },
});

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper to generate SQL using LangChain / Gemini
async function generateSql(nlQuery , schemaDescription = "") {
  const prompt = `
-- Convert the following natural language request to SQL:
-- Schema: ${schemaDescription}
-- Request: ${nlQuery}
SQL Query:
`;
  const aiMsg = await llm.invoke(prompt);
  const text =
    typeof aiMsg?.content === "string"
      ? aiMsg.content
      : Array.isArray(aiMsg?.content)
      ? aiMsg.content.map((c) => (typeof c === "string" ? c : c?.text ?? "")).join("\n")
      : "";

  return text.replace(/sql/i, "").replace(/```/g, "").trim();
}

// Node 1: fetch schema from MongoDB
graph.addNode("fetchSchema", async (state) => {
  const { projectId, tableName } = state;

  // Use lean() to get plain JS object instead of Mongoose Document
  const meta = await TableMeta.findOne({ projectId, tableName }).lean();
  if (!meta) throw new Error("Schema not found in MongoDB");

  const columns =
    Array.isArray(meta.schema) && meta.schema.length
      ? meta.schema.map((c) => c.columnName)
      : [];
  const schemaDescription = `${meta.tableName}(${columns.join(", ")})`;

  console.log("📄 fetchSchema -> schemaDescription:", schemaDescription);

  return { meta, schemaDescription };
});

// Node 2: generate SQL
graph.addNode("generateSql", async (state) => {
  const { query, schemaDescription } = state;
  const sql = await generateSql(query, schemaDescription);
  return { sql };
});

// Node 3: execute SQL
graph.addNode("execSql", async (state) => {
  const { sql } = state;
  const result = await pool.query(sql);
  return { result };
});

// Node 4: build response
graph.addNode("buildResponse", async (state) => {
  const { projectId, tableName, query, sql, result } = state;
  return {
    response: {
      projectId,
      tableName,
      naturalLanguage: query,
      generatedSQL: sql,
      rows: result.rows,
    },
  };
});

// Graph edges
graph.addEdge(START, "fetchSchema");
graph.addEdge("fetchSchema", "generateSql");
graph.addEdge("generateSql", "execSql");
graph.addEdge("execSql", "buildResponse");
graph.addEdge("buildResponse", END);

const compiled = graph.compile();

// ---------------------------
// Combined endpoint
// ---------------------------
// ---------------------------
// Combined endpoint with logs
// ---------------------------
app.post("/project/:projectId/query", async (req, res) => {
  const { projectId } = req.params;
  const { message } = req.body;

  console.log("📩 Incoming request:", { projectId, message });

  if (!message) {
    console.log("⚠️ No message provided");
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // --- Fetch project metadata ---
    console.log("🔍 Fetching project metadata from MongoDB");
    const project = await TableMeta.findOne({ projectId });
    if (!project) {
      console.log("❌ Project not found:", projectId);
      return res.status(404).json({ error: "Project not found" });
    }

    console.log("✅ Project found:", project.projectName);

    const tableName = project.tableName;
    const schema = project.schema || [];
    const charts = project.charts || [];

    console.log(`📊 Table: ${tableName}, Columns: ${schema.length}, Charts: ${charts.length}`);

    // --- Fetch chat history ---
    console.log("💬 Fetching chat history");
    const chatDoc = await ChatHistory.findOne({ projectId });
    const messages = chatDoc?.messages || [];
    console.log(`📝 Previous messages: ${messages.length}`);

    messages.push({ role: "user", content: message });

    // --- Decide if SQL is needed ---
    console.log("🤖 Deciding whether this is SQL or conversational query");
    const sqlDecisionPrompt = `
You are an AI assistant for a data project.
Determine if the user's message should be converted to a SQL query.
Respond only with "SQL" or "CONVERSATION".

User message: "${message}"
    `;

    const decisionResponse = await llm.invoke(sqlDecisionPrompt);
    const decision =
      typeof decisionResponse.content === "string"
        ? decisionResponse.content.trim().toUpperCase()
        : "CONVERSATION";

    console.log("📝 Decision:", decision);

    let assistantReply = "";

    if (decision === "SQL") {
      console.log("⚡ Executing SQL path via LangGraph");
      const finalState = await compiled.invoke({
        projectId,
        tableName,
        query: message,
      });
      assistantReply = JSON.stringify(finalState.response, null, 2);
      console.log("✅ SQL response generated");
    } else {
      console.log("💬 Executing conversational path");
      const schemaDescription = schema.map((c) => c.columnName).join(", ");
      console.log("📄 Schema description:", schemaDescription);

      const prompt = [
        {
          role: "system",
          content: `You are a helpful assistant. Project: ${project.projectName}, Table: ${tableName}, Schema: ${schemaDescription}`,
        },
        ...messages,
      ]
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const aiResponse = await llm.invoke(prompt);
      assistantReply =
        typeof aiResponse.content === "string" ? aiResponse.content : "";
      console.log("✅ Conversational response generated");
    }

    // --- Save assistant reply ---
    messages.push({ role: "assistant", content: assistantReply });
    await ChatHistory.updateOne(
      { projectId },
      { $set: { messages } },
      { upsert: true }
    );
    console.log("💾 Assistant reply saved to chat history");

    // --- Return metadata + chat ---
    res.json({
      project: {
        id: project.projectId,
        name: project.projectName,
        tableName,
        schema,
        charts,
        numRows: project.numRows || 0,
      },
      chat: messages,
      assistant: assistantReply,
      decision,
    });
    console.log("📤 Response sent successfully");
  } catch (err) {
    console.error("❌ Error handling request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



// ---------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

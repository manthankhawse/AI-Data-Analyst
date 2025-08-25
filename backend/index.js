import express from "express";
import fs from "fs";
import { Pool } from "pg";
import csv from "csv-parser";
import multer from "multer";
import mongoose from "mongoose";
import XLSX from "xlsx";
import cors from "cors";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

// PostgreSQL
const DB_URL = "postgresql://myuser:mypassword@localhost:5432/mydb";
const pool = new Pool({ connectionString: DB_URL });

// MongoDB
const MONGO_URL =
  "mongodb://mongo_user:mongo_pass@localhost:27017/csv_metadata?authSource=admin";
mongoose.connect(MONGO_URL, { useNewUrlParser: true });
const mongoDb = mongoose.connection;
mongoDb.on("error", console.error.bind(console, "MongoDB connection error:"));
mongoDb.once("open", () => console.log("✅ Connected to MongoDB"));

// Mongo schema
const tableSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  projectName : {type:String, required: true},
  tableName: { type: String, required: true },
  schema: [
    {
      columnName: { type: String, required: true },
      type: { type: String, default: "TEXT" },
    },
  ],
  numRows: { type: Number, default: 0 },  // NEW FIELD
  charts: { type: Array, default: [] },
},{
  timestamps:true
});
const TableMeta = mongoose.model("TableMeta", tableSchema);

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



// Multer setup
const upload = multer({ dest: "uploads/" });

/**
 * Create table dynamically in Postgres
 */
async function createTable(tableName, columns, rows) {
  const schemaMetadata = inferColumnTypes(columns, rows);
  const colsDef = schemaMetadata
    .map((c) => `"${c.columnName}" ${c.type}`)
    .join(", ");
  const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colsDef});`;
  await pool.query(query);
  console.log(
    `✅ Table "${tableName}" ready with ${columns.length} columns`
  );
  return schemaMetadata;
}

/**
 * Infer Postgres column types
 */
function inferColumnTypes(columns, rows) {
  // Define a type hierarchy from most specific to most general.
  const typeHierarchy = [
    "BOOLEAN",
    "INTEGER",
    "BIGINT",
    "DOUBLE PRECISION",
    "TIMESTAMP",
    "TEXT",
  ];

  return columns.map((col, colIndex) => {
    let bestTypeIndex = -1; // Start with no detected type

    for (const row of rows) {
      const val = row[colIndex];
      if (val === null || val === "") continue; // Skip nulls/empty strings

      let currentTypeIndex = -1;

      if (["true", "false"].includes(val.toLowerCase())) {
        currentTypeIndex = typeHierarchy.indexOf("BOOLEAN");
      } else if (/^-?\d+$/.test(val)) {
        const num = Number(val);
        // Use BigInt for accurate comparison beyond JS's safe integer limit
        if (num >= -2147483648 && num <= 2147483647) {
          currentTypeIndex = typeHierarchy.indexOf("INTEGER");
        } else {
          currentTypeIndex = typeHierarchy.indexOf("BIGINT");
        }
      } else if (!isNaN(parseFloat(val)) && isFinite(val)) {
        currentTypeIndex = typeHierarchy.indexOf("DOUBLE PRECISION");
      } else if (!isNaN(Date.parse(val))) {
        currentTypeIndex = typeHierarchy.indexOf("TIMESTAMP");
      } else {
        currentTypeIndex = typeHierarchy.indexOf("TEXT");
      }

      // If the current value's type is more general than the best one we've found so far, upgrade.
      if (currentTypeIndex > bestTypeIndex) {
        bestTypeIndex = currentTypeIndex;
      }

      // If we've already hit TEXT, we can't get any more general, so we can stop checking this column.
      if (typeHierarchy[bestTypeIndex] === "TEXT") {
        break;
      }
    }

    // Default to TEXT if no non-null values were found
    const detectedType =
      bestTypeIndex === -1 ? "TEXT" : typeHierarchy[bestTypeIndex];

    return { columnName: col, type: detectedType };
  });
}

/**
 * CSV parser
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let columns = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => (columns = headers.map((h) => h.trim())))
      .on("data", (data) => {
        const row = columns.map((col) => {
          const value = data[col];
          return value === "" || value === "NaN" || value == null
            ? null
            : value.toString().trim();
        });
        results.push(row);
      })
      .on("end", () => resolve({ columns, rows: results }))
      .on("error", reject);
  });
}

/**
 * JSON parser
 */
function parseJSON(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const jsonData = JSON.parse(raw);

  if (!Array.isArray(jsonData))
    throw new Error("JSON file must be an array of objects");

  const columns = Array.from(
    new Set(jsonData.flatMap((row) => Object.keys(row)))
  );
  const rows = jsonData.map((row) =>
    columns.map((col) =>
      row[col] === undefined || row[col] === null ? null : row[col].toString()
    )
  );

  return { columns, rows };
}

/**
 * Excel parser
 */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (!Array.isArray(jsonData) || !jsonData.length)
    throw new Error("Excel sheet is empty");

  const columns = Array.from(
    new Set(jsonData.flatMap((row) => Object.keys(row)))
  );
  const rows = jsonData.map((row) =>
    columns.map((col) =>
      row[col] === undefined || row[col] === null ? null : row[col].toString()
    )
  );

  return { columns, rows };
}

/**
 * Insert data in chunks (avoids Postgres param limits)
 */
/**
 * Convert a string to the correct type based on Postgres type
 */
function castValue(value, pgType) {
  if (value === null) return null;

  switch (pgType) {
    case "BOOLEAN":
      return value.toLowerCase() === "true";
    case "INTEGER":
    case "BIGINT":
      return parseInt(value, 10);
    case "DOUBLE PRECISION":
      return parseFloat(value);
    case "TIMESTAMP":
      return new Date(value); // pg driver converts Date -> timestamp
    default:
      return value.toString();
  }
}


async function insertData(tableName, columns, rows, schemaMetadata, chunkSize = 500) {
  const colsList = columns.map((c) => `"${c}"`).join(", ");
  const MAX_PARAMS = 65535;
  const maxRowsPerChunk = Math.floor(MAX_PARAMS / columns.length);
  const safeChunkSize = Math.min(chunkSize, maxRowsPerChunk);

  for (let i = 0; i < rows.length; i += safeChunkSize) {
    const chunk = rows.slice(i, i + safeChunkSize);
    if (!chunk.length) continue;

    const values = [];
    let paramIndex = 1;
    const placeholders = chunk
      .map((row) => {
        while (row.length < columns.length) row.push(null);
        if (row.length > columns.length) row = row.slice(0, columns.length);

        const rowPlaceholders = row.map((val, colIdx) => {
          const pgType = schemaMetadata[colIdx].type;
          values.push(castValue(val, pgType));
          return `$${paramIndex++}`;
        });
        return `(${rowPlaceholders.join(", ")})`;
      })
      .join(",");

    const query = `INSERT INTO "${tableName}" (${colsList}) VALUES ${placeholders};`;
    await pool.query(query, values);
  }
}


/**
 * Upload route
 */
app.post("/upload/:projectId/:tableName", upload.single("file"), async (req, res) => {
  const { projectId, tableName } = req.params;
  const { projectName } = req.body;
  const filePath = req.file?.path;

  if (!filePath) return res.status(400).send("❌ No file uploaded");

  try {
    let data;
    const ext = req.file.originalname.split(".").pop().toLowerCase();

    if (ext === "csv") data = await parseCSV(filePath);
    else if (ext === "json") data = parseJSON(filePath);
    else if (ext === "xlsx" || ext === "xls") data = parseExcel(filePath);
    else return res.status(400).send("❌ Unsupported file type");

    const schemaMetadata = await createTable(tableName, data.columns, data.rows);
    await insertData(tableName, data.columns, data.rows, schemaMetadata);

    const updatedTable = await TableMeta.findOneAndUpdate(
      { projectId, tableName },
      { projectId, tableName, projectName, schema: schemaMetadata, numRows: data.rows.length },
      { upsert: true, new: true }
    );

    fs.unlinkSync(filePath);
    res.json({
      success: true,
      message: `✅ Data uploaded to "${tableName}" and schema saved for project "${projectId}"`,
      table: {
        projectId: updatedTable.projectId,
        tableName: updatedTable.tableName,
        projectName: updatedTable.projectName,
        numRows: updatedTable.numRows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error processing file");
  }
});

// app.get(/)

app.get("/projects", async (req, res) => {
  try {
    // Fetch all tables metadata
    const tables = await TableMeta.find().lean();

    // Group by projectId
    const projects = {};
    for (const t of tables) {
      if (!projects[t.projectId]) {
        projects[t.projectId] = { projectId: t.projectId, name: t.projectName, tables: [] };
      }
      projects[t.projectId].tables.push({
        tableName: t.tableName,
        schema: t.schema,
        numRows: t.numRows,
        charts: t.charts,
      });
    }

    res.json(Object.values(projects));
  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askGeminiForQueries(tableName, schema) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a data analyst. Based on the schema below, generate 5–7 useful SQL aggregation queries 
AND recommend how to visualize the results with Recharts.

⚠️ IMPORTANT:
- Use PostgreSQL syntax
- Use the column names exactly as provided (case-sensitive)
- Table name is: ${tableName}

✅ Try to cover a variety of insights:
- Trends over time (LineChart, AreaChart)
- Rankings (BarChart, HorizontalBarChart)
- Distributions (Histogram/BarChart)
- Comparisons across categories (StackedBarChart, GroupedBarChart)
- Proportions (PieChart, DonutChart, Treemap)
- Min/Max/Top-N summaries
- Correlation between two numeric columns (ScatterChart, BubbleChart)

Return a JSON array of objects with this structure:
{
  "description": "...",
  "query": "...",
  "chart": {
    "type": "BarChart | LineChart | PieChart | AreaChart | ScatterChart | BubbleChart | Treemap",
    "x": "column_name",
    "y": "column_name or aggregate",
    "series": "optional column for grouping"
  }
}

Table: ${tableName}
Columns:
${schema.map(c => `- ${c.column_name} (${c.data_type})`).join("\n")}
`;

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // cleanup code fences
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("⚠️ Failed to parse Gemini output:", text);
    return [];
  }
}


// ---- Quote identifiers helper ----
function quoteIdentifiers(query, schema) {
  let newQuery = query;
  for (const col of schema) {
    const colName = col.column_name;
    const regex = new RegExp(`\\b${colName}\\b`, "g"); // exact match
    newQuery = newQuery.replace(regex, `"${colName}"`);
  }
  return newQuery;
}

// ---- Route ----
app.get("/charts/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
    const collection = mongoDb.collection("tablemetas");
    const project = await collection.findOne({ projectId });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const tableName = project.tableName;

    // Fetch schema from Postgres
    const schemaRes = await pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    if (schemaRes.rows.length === 0) {
      return res.status(404).json({ error: "Table not found in Postgres" });
    }

    let queries;

    if (project.charts && project.charts.length > 0) {
      // ✅ Use cached charts
      queries = project.charts;
      console.log("📂 Using cached charts from MongoDB");
    } else {
      // ❌ No charts, generate using Gemini
      queries = await askGeminiForQueries(tableName, schemaRes.rows);

      // Save queries to MongoDB for next time
      await collection.updateOne(
        { projectId },
        { $set: { charts: queries } }
      );

      console.log("✨ Generated new charts and saved to MongoDB");
    }

    // Execute queries
    const results = [];
    for (const q of queries) {
      try {
        const safeQuery = quoteIdentifiers(q.query, schemaRes.rows);
        const pgRes = await pool.query(safeQuery);
        results.push({
          description: q.description,
          query: safeQuery,
          chart: q.chart,
          data: pgRes.rows,
        });
      } catch (err) {
        console.error("❌ SQL failed:", q.query, err.message);
      }
    }

    res.json({
      projectId,
      projectName: project.projectName,
      tableName,
      charts: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


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

app.post("/project/:projectId/query", async (req, res) => {
  const { projectId } = req.params;
  let { message } = req.body;

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
    message = await translateToEnglish(message);
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


const md = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function translateToEnglish(text){

  try {
    // Get the generative model
    const model = md.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build prompt
    const prompt = `
Translate the following text to English, keeping the meaning intact:
"""${text}"""
Return only the translated text, no explanations.
`;

    // Generate content
    const result = await model.generateContent(prompt);
    let translated = result.response.text();
    return translated;
  }catch(e){
    console.log(e);
  }
};





app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(express.json());

// ---------------------------
// PostgreSQL connection
// ---------------------------
const DB_URL = "postgresql://myuser:mypassword@localhost:5432/mydb";
const pool = new Pool({ connectionString: DB_URL });

// ---------------------------
// MongoDB connection (Mongoose)
// ---------------------------
const MONGO_URL =
  "mongodb://mongo_user:mongo_pass@localhost:27017/csv_metadata?authSource=admin";

await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
console.log("✅ Connected to MongoDB");

// Schema collection
const tableSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  tableName: { type: String, required: true },
  schema: [
    {
      columnName: { type: String, required: true },
      type: { type: String, default: "TEXT" },
    },
  ],
});
const TableMeta = mongoose.model("TableMeta", tableSchema, "tablemetas");

// ---------------------------
// Gemini setup
// ---------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateSql(nlQuery, schemaDescription = "") {
  const prompt = `
-- Convert the following natural language request to SQL:
-- Schema: ${schemaDescription}
-- Important: Use the column names exactly as they appear in the schema (case-sensitive, with double quotes if needed).
-- Request: ${nlQuery}
SQL Query:
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);

  let sql = result.response.text();

  // Clean Gemini output
  sql = sql.replace(/```sql/i, "").replace(/```/g, "").trim();
  return sql;
}

// ---------------------------
// API endpoint
// ---------------------------
app.post("/query/:projectId/:tableName", async (req, res) => {
  const { projectId, tableName } = req.params;
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Please provide 'query' in request body" });
  }

  try {
    // 1. Fetch schema from MongoDB
    const meta = await TableMeta.findOne({ projectId, tableName });
    if (!meta) {
      return res.status(404).json({ error: "Schema not found in MongoDB" });
    }

    // ✅ Keep original column names with quotes
    const schemaDescription = `${meta.tableName}(${meta.schema
      .map((c) => `"${c.columnName}"`)
      .join(", ")})`;

    // 2. Generate SQL using Gemini
    let sql = await generateSql(query, schemaDescription);
    console.log("📝 Generated SQL:", sql);

    // 3. Execute SQL on PostgreSQL
    const result = await pool.query(sql);

    // 4. Return result in JSON
    const response = {
      projectId,
      tableName,
      naturalLanguage: query,
      generatedSQL: sql.trim(),
      rows: result.rows,
    };

    console.log("📦 Query Result:", JSON.stringify(response, null, 2));
    res.json(response);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

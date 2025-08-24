import express from "express";
import { Pool } from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 8080;

app.use(cors());

// ---- PostgreSQL ----
const pool = new Pool({
  connectionString: "postgresql://myuser:mypassword@localhost:5432/mydb"
});

// ---- Gemini ----
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
app.get("/charts/:tableName", async (req, res) => {
  const { tableName } = req.params;

  try {
    // 1. Fetch schema directly from Postgres
    const schemaRes = await pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    if (schemaRes.rows.length === 0) {
      return res.status(404).json({ error: "Table not found" });
    }

    // 2. Ask Gemini for queries + chart configs
    const queries = await askGeminiForQueries(tableName, schemaRes.rows);

    // 3. Execute queries
    const results = [];
    for (const q of queries) {
      try {
        const safeQuery = quoteIdentifiers(q.query, schemaRes.rows);
        const pgRes = await pool.query(safeQuery);
        results.push({
          description: q.description,
          query: safeQuery,
          chart: q.chart,
          data: pgRes.rows
        });
      } catch (err) {
        console.error("❌ SQL failed:", q.query, err.message);
      }
    }

    // 4. Return
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

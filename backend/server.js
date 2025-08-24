import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());

// Init Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateSql(nlQuery, schemaDescription = "") {
  const prompt = `
-- Convert the following natural language request to SQL:
-- Schema: ${schemaDescription}
-- Request: ${nlQuery}
SQL Query:
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Example schema
const schema = "users(id, name, age), orders(id, user_id, amount)";

// ✅ API endpoint
app.post("/generate-sql", async (req, res) => {
  const { query } = req.body; // expecting JSON { "query": "your natural lang request" }

  if (!query) {
    return res.status(400).json({ error: "Please provide a query in request body" });
  }

  try {
    const sql = await generateSql(query, schema);

    // Output in JSON format
    res.json({
      success: true,
      naturalLanguage: query,
      generatedSQL: sql.trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

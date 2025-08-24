import express from "express";
import fs from "fs";
import { Pool } from "pg";
import csv from "csv-parser";
import multer from "multer";
import mongoose from "mongoose";

const app = express();
const PORT = 3000;

// 🔹 Postgres connection
const DB_URL = "postgresql://myuser:mypassword@localhost:5432/mydb";
const pool = new Pool({ connectionString: DB_URL });

// 🔹 MongoDB connection
const MONGO_URL = "mongodb://localhost:27017/csv_metadata";
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const mongoDb = mongoose.connection;
mongoDb.on("error", console.error.bind(console, "MongoDB connection error:"));
mongoDb.once("open", () => console.log("✅ Connected to MongoDB"));

// MongoDB schema
const tableSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  tableName: { type: String, required: true },
  schema: [
    {
      columnName: { type: String, required: true },
      type: { type: String, default: "TEXT" }, // default to TEXT for now
    },
  ],
});

const TableMeta = mongoose.model("TableMeta", tableSchema);

// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });

// --- helpers ---

async function createTable(tableName, columns) {
  const colsDef = columns.map((c) => `"${c}" TEXT`).join(", ");
  const query = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colsDef});`;
  await pool.query(query);
  console.log(`✅ Table "${tableName}" ready with ${columns.length} columns`);
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    let columns = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => {
        columns = headers.map((h) => h.trim());
      })
      .on("data", (data) => {
        const row = columns.map((col) => {
          const value = data[col];
          if (value === "" || value === "NaN" || value === null || value === undefined) {
            return null;
          }
          return value.toString().trim();
        });
        results.push(row);
      })
      .on("end", () => resolve({ columns, rows: results }))
      .on("error", reject);
  });
}

async function insertData(tableName, columns, rows, chunkSize = 500) {
  const colsList = columns.map((c) => `"${c}"`).join(", ");
  const MAX_PARAMS = 65535;
  const maxRowsPerChunk = Math.floor(MAX_PARAMS / columns.length);
  const safeChunkSize = Math.min(chunkSize, maxRowsPerChunk);

  for (let i = 0; i < rows.length; i += safeChunkSize) {
    const chunk = rows.slice(i, i + safeChunkSize);
    if (chunk.length === 0) continue;

    const values = [];
    let paramIndex = 1;

    const placeholders = chunk
      .map((row) => {
        if (row.length !== columns.length) {
          while (row.length < columns.length) row.push(null);
          if (row.length > columns.length) row = row.slice(0, columns.length);
        }
        const rowPlaceholders = row.map((val) => {
          values.push(val);
          return `$${paramIndex++}`;
        });
        return `(${rowPlaceholders.join(", ")})`;
      })
      .join(", ");

    const query = `INSERT INTO "${tableName}" (${colsList}) VALUES ${placeholders};`;
    await pool.query(query, values);
  }
}

app.post("/upload-csv/:projectId/:tableName", upload.single("file"), async (req, res) => {
  const { projectId, tableName } = req.params;
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).send("❌ No CSV file uploaded");
  }

  try {
    const { columns, rows } = await readCSV(filePath);
    await createTable(tableName, columns);
    await insertData(tableName, columns, rows);

    // Store schema metadata in MongoDB
    const schemaMetadata = columns.map((col) => ({ columnName: col, type: "TEXT" }));
    await TableMeta.findOneAndUpdate(
      { projectId, tableName },
      { projectId, tableName, schema: schemaMetadata },
      { upsert: true, new: true }
    );

    // Cleanup uploaded file
    fs.unlinkSync(filePath);

    res.send(`✅ Data uploaded to "${tableName}" and schema saved for project "${projectId}"`);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error uploading CSV data");
  }
});

// --- start server ---
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

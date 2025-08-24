// server.js
import express from "express";
import fs from "fs";
import { Pool } from "pg";
import csv from "csv-parser";

const app = express();
const PORT = 3000;

const DB_URL = "postgresql://neondb_owner:npg_ilaUVtoDy90r@ep-weathered-queen-addidpma-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";
const TABLE_NAME = "csv_test";
const CSV_FILE = "./data.csv";

const pool = new Pool({ connectionString: DB_URL });

async function createTable(columns) {
  const colsDef = columns.map((c) => `"${c}" TEXT`).join(", ");
  const query = `CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (${colsDef});`;
  await pool.query(query);
}

async function insertData(columns, rows, chunkSize = 500) {
  const colsList = columns.map((c) => `"${c}"`).join(", ");
  
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const rowPlaceholders = row.map((_, colIndex) => {
        values.push(row[colIndex]);
        return `$${values.length}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    }).join(", ");
    
    const query = `INSERT INTO "${TABLE_NAME}" (${colsList}) VALUES ${placeholders};`;
    await pool.query(query, values);
  }
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    const columns = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => headers.forEach((h) => columns.push(h)))
      .on("data", (data) => {
        const row = columns.map((col) =>
          data[col] === "" || data[col] === "NaN" ? null : data[col]
        );
        results.push(row);
      })
      .on("end", () => resolve({ columns, rows: results }))
      .on("error", reject);
  });
}

app.get("/upload-csv", async (req, res) => {
  try {
    const { columns, rows } = await readCSV(CSV_FILE);
    await createTable(columns);
    await insertData(columns, rows);
    res.send("✅ Data uploaded successfully to NeonDB!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error uploading CSV data");
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// server.js
import express from "express";
import multer from "multer";
import { Pool } from "pg";
import xlsx from "xlsx";
import csvParser from "csv-parser";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

// --- NeonDB Connection ---
const pool = new Pool({
  connectionString:
    "postgresql://tutorial_owner:5IANnrD4lPvT@ep-steep-king-a5c8gfgl-pooler.us-east-2.aws.neon.tech/tutorial?sslmode=require&channel_binding=require",
});

// --- Helper to insert data ---
async function insertData(table, rows) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const query = `
    INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(", ")})
    VALUES ${rows
      .map(
        (_, i) =>
          `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(", ")})`
      )
      .join(", ")}
  `;
  const values = rows.flatMap((r) => cols.map((c) => r[c]));
  await pool.query(query, values);
}

// --- Upload Endpoint ---
app.post("/upload", upload.single("file"), async (req, res) => {
  const { table } = req.body; // table name
  const file = req.file;

  if (!file) return res.status(400).send("No file uploaded");

  let rows = [];

  try {
    if (file.originalname.endsWith(".xlsx")) {
      // Excel
      const workbook = xlsx.readFile(file.path);
      const sheet = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
    } else if (file.originalname.endsWith(".csv")) {
      // CSV
      rows = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(file.path)
          .pipe(csvParser())
          .on("data", (data) => results.push(data))
          .on("end", () => resolve(results))
          .on("error", reject);
      });
    } else if (file.originalname.endsWith(".json")) {
      // JSON
      rows = JSON.parse(fs.readFileSync(file.path, "utf-8"));
    } else {
      return res.status(400).send("Unsupported file format");
    }

    await insertData(table, rows);
    res.send("Data inserted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing file");
  } finally {
    fs.unlinkSync(file.path); // cleanup
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

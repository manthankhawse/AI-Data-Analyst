import express from "express";
import fs from "fs";
import { Pool } from "pg";
import csv from "csv-parser";
import multer from "multer";
import mongoose from "mongoose";
import XLSX from "xlsx";

const app = express();
const PORT = 8080;

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
  tableName: { type: String, required: true },
  schema: [
    {
      columnName: { type: String, required: true },
      type: { type: String, default: "TEXT" },
    },
  ],
});
const TableMeta = mongoose.model("TableMeta", tableSchema);

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

    await TableMeta.findOneAndUpdate(
      { projectId, tableName },
      { projectId, tableName, schema: schemaMetadata },
      { upsert: true, new: true }
    );

    fs.unlinkSync(filePath);
    res.send(`✅ Data uploaded to "${tableName}" and schema saved for project "${projectId}"`);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error processing file");
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

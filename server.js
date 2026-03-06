const express = require("express");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const morgan = require("morgan");
const chokidar = require("chokidar");

const app = express();
const PORT = process.env.PORT || 3000;

const EXCEL_PATH = path.join(__dirname, "data", "employees.xlsx");

// Cache
let employees = [];
let lastLoadedAt = null;

// --- Helpers ---
function isLikelyExcelDateHeader(header) {
  return typeof header === "string" && header.includes("ថ្ងៃ");
}

function formatDateValue(v) {
  // Excel date can be a number (serial) OR a JS date OR a string
  if (v == null || v === "") return "";

  // If it's already a Date object:
  if (v instanceof Date && !isNaN(v)) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const yyyy = v.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // If it's numeric serial date:
  if (typeof v === "number") {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const dd = String(parsed.d).padStart(2, "0");
      const mm = String(parsed.m).padStart(2, "0");
      const yyyy = parsed.y;
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  // Otherwise string
  return String(v);
}

function normalizeText(t) {
  if (t == null) return "";
  return String(t).trim().toLowerCase();
}

function loadEmployeesFromExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("Excel file not found:", EXCEL_PATH);
    employees = [];
    return;
  }

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // Convert to JSON preserving headers
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  // Post-process date columns + add helper fields
  employees = rows.map((row, idx) => {
    const cleaned = { ...row };

    // Format date fields if header includes "ថ្ងៃ"
    for (const key of Object.keys(cleaned)) {
      if (isLikelyExcelDateHeader(key)) {
        cleaned[key] = formatDateValue(cleaned[key]);
      }
    }

    // Create search fields
    const name = cleaned["គោន្តនាម-នាម"] || "";
    const id = cleaned["អត្តលេខ"] || "";

    cleaned.__index = idx;
    cleaned.__name_norm = normalizeText(name);
    cleaned.__id_norm = normalizeText(id);

    return cleaned;
  });

  lastLoadedAt = new Date();
  console.log(
    `Loaded ${employees.length} employees from Excel (${sheetName}) at ${lastLoadedAt.toISOString()}`
  );
}

// initial load
loadEmployeesFromExcel();

// watch for changes
chokidar.watch(EXCEL_PATH, { ignoreInitial: true }).on("all", (event) => {
  console.log("Excel changed:", event, "→ Reloading...");
  try {
    loadEmployeesFromExcel();
  } catch (e) {
    console.error("Failed to reload Excel:", e);
  }
});

app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));

// --- API ---
app.get("/api/meta", (req, res) => {
  res.json({
    ok: true,
    count: employees.length,
    excelPath: "data/employees.xlsx",
    lastLoadedAt
  });
});

app.get("/api/search", (req, res) => {
  const q = normalizeText(req.query.q || "");
  if (!q) return res.json({ count: 0, results: [] });

  // Search by name OR ID
  const results = employees
    .filter((e) => e.__name_norm.includes(q) || e.__id_norm.includes(q))
    .slice(0, 50)
    .map((e) => {
      // Remove internal fields
      const { __name_norm, __id_norm, __index, ...safe } = e;
      return safe;
    });

  res.json({ count: results.length, results });
});

app.get("/api/employee", (req, res) => {
  // Get by exact ID (អត្តលេខ)
  const id = normalizeText(req.query.id || "");
  if (!id) return res.status(400).json({ ok: false, message: "Missing id" });

  const found = employees.find((e) => e.__id_norm === id);
  if (!found) return res.status(404).json({ ok: false, message: "Not found" });

  const { __name_norm, __id_norm, __index, ...safe } = found;
  res.json({ ok: true, employee: safe });
});

app.listen(PORT, "10.201.1.185", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
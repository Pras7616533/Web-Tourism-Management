const http = require("http");
const fs = require("fs");
const path = require("path");

const baseDir = __dirname;
const dataDir = path.join(baseDir, "data");
const csvPath = path.join(dataDir, "bookings.csv");
const port = 3000;

const csvHeaders = [
  "createdAt",
  "name",
  "package",
  "hotel",
  "mobile",
  "email",
  "address",
  "arrivalDate",
  "leavingDate",
  "guests",
  "roomType",
  "transport",
  "foodPlan",
  "specialRequirements",
  "paymentMode",
  "totalAmount"
];

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".csv": "text/csv",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

function ensureCsvFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, csvHeaders.join(",") + "\n");
  }
}

function escapeCsv(value) {
  const safe = String(value ?? "");
  if (safe.includes('"') || safe.includes(",") || safe.includes("\n")) {
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  return safe;
}

function appendCsvRow(data) {
  ensureCsvFile();
  const row = csvHeaders.map(key => escapeCsv(data[key])).join(",");
  fs.appendFileSync(csvPath, row + "\n");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function handleApi(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 1e6) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      const data = JSON.parse(body || "{}");
      appendCsvRow(data);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const safePath = pathname.replace(/^\/+/, "");
  const resolvedBase = path.resolve(baseDir);
  const filePath = path.resolve(baseDir, safePath);
  if (!filePath.startsWith(resolvedBase)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/bookings")) {
    handleApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  ensureCsvFile();
  console.log(`Server running at http://localhost:${port}`);
});

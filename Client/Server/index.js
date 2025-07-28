const express = require("express");
const cors = require("cors");
require("./db");
const connectDB = require("./db");
const multer = require("multer");
const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path");
const httpProxy = require("http-proxy");
const proxy = httpProxy.createProxyServer({});
const http = require("http");
const { Server } = require("ws");
const pty = require("node-pty");

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });
app.use(cors());
app.use(express.json());

wss.on("connection", (ws, req) => {
  const shell = pty.spawn("ssh", ["root@127.0.0.1", "-p", "8081"], {
    name: "xterm-color",
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env,
  });

  shell.on("data", (data) => ws.send(data));
  ws.on("message", (msg) => shell.write(msg));
  ws.on("close", () => shell.kill());
});

const PORT = 3000;

connectDB();

// Configure multer to store zip files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    // Create uploads folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    // Allow only zip files
    cb(null, uploadPath);
  },
  // filename: date-uid
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Multer upload instance
const upload = multer({ storage });

function ensureAuthenticated(req, res, next) {
  return next();
}

function getPortForRouter(id) {
  const portMap = {
    ap0c2: 8081,
  };
  return portMap[id];
}

app.use("/router/:id", (req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: 8081,
    path: req.url.replace(`/router/${req.params.id}`, ""),
    method: req.method,
    headers: {
      ...req.headers,
      host: "10.212.5.1",
    },
    rejectUnauthorized: false,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = {
      ...proxyRes.headers,
    };

    // Strip blocking headers
    delete headers["x-frame-options"];
    delete headers["content-security-policy"];

    // Allow cookies and iframe use
    headers["access-control-allow-origin"] = req.headers.origin || "*";
    headers["access-control-allow-credentials"] = "true";

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  req.pipe(proxyReq);

  proxyReq.on("error", (e) => {
    console.error("Proxy error:", e);
    res.status(500).send("Proxy error");
  });
});

// Endpoint to upload zip file
app.post("/api/upload-zip", upload.single("zipFile"), async (req, res) => {
  try {
    // Get UID from body, query, or headers
    const uid = req.body.uid || req.query.uid || req.headers["x-device-uid"];
    // Basic validation
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    if (!uid) {
      return res.status(400).json({ message: "No unique ID (uid) provided." });
    }

    // Path to the uploaded zip file
    const zipPath = req.file.path;

    // Create unique extraction folder using UID and timestamp
    const timestamp = Date.now();
    const extractRoot = path.join("extracted", `${uid}_${timestamp}`);

    // Create extraction root if it doesn't exist
    if (!fs.existsSync("extracted")) {
      fs.mkdirSync("extracted");
    }

    // Extract the zip file
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractRoot }))
        .on("close", resolve)
        .on("error", reject);
    });

    const subdirs = fs
      .readdirSync(extractRoot)
      .filter((name) =>
        fs.statSync(path.join(extractRoot, name)).isDirectory()
      );

    const targetDir =
      subdirs.length > 0 ? path.join(extractRoot, subdirs[0]) : extractRoot;

    // Read all files in targetDir
    const files = fs.readdirSync(targetDir);
    const fileContents = [];

    // Read content of each file
    for (const file of files) {
      const fullPath = path.join(targetDir, file);
      if (fs.statSync(fullPath).isFile()) {
        const content = fs.readFileSync(fullPath, "utf-8");
        fileContents.push({ filename: file, content });
      }
    }

    res.status(200).json({
      message: "Upload and extraction complete",
      uid,
      folder: `${uid}_${timestamp}`,
      files: fileContents,
    });
  } catch (err) {
    console.error("Error processing uploaded zip:", err);
    res.status(500).json({ message: "Upload or extraction failed" });
  }
});

// Endpoint to get all extracted uploads
app.get("/api/uploads", async (req, res) => {
  try {
    const extractedRoot = "extracted";
    if (!fs.existsSync(extractedRoot)) {
      return res.status(200).json([]);
    }

    // Group by UID
    const allDirs = fs
      .readdirSync(extractedRoot)
      .filter((name) =>
        fs.statSync(path.join(extractedRoot, name)).isDirectory()
      );

    const uidMap = {};

    for (const dir of allDirs) {
      const [uid, timestamp] = dir.split("_");
      if (!uidMap[uid]) uidMap[uid] = [];
      uidMap[uid].push({ dir, timestamp: Number(timestamp) });
    }

    const allData = [];

    for (const uid in uidMap) {
      const sortedDirs = uidMap[uid]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 24); // only 24 most recent uploads per UID

      for (const { dir } of sortedDirs) {
        const fullPath = path.join(extractedRoot, dir);

        const subdirs = fs
          .readdirSync(fullPath)
          .filter((name) =>
            fs.statSync(path.join(fullPath, name)).isDirectory()
          );

        let dataPath = fullPath;
        if (subdirs.length > 0) {
          dataPath = path.join(fullPath, subdirs[0]);
        }

        const files = fs
          .readdirSync(dataPath)
          .filter((f) => fs.statSync(path.join(dataPath, f)).isFile())
          .map((f) => ({
            filename: f,
            content: fs.readFileSync(path.join(dataPath, f), "utf-8"),
          }));

        allData.push({
          uid,
          timestamp: dir.split("_")[1],
          files,
        });
      }
    }

    res.json(allData);
  } catch (err) {
    console.error("Failed to read extracted files:", err);
    res.status(500).json({ message: "Failed to load extracted data." });
  }
});

app.get("/api/iperf/:id", (req, res) => {
  const { id } = req.params;
  const extractedRoot = "extracted";

  const matchingFolders = fs
    .readdirSync(extractedRoot)
    .filter((folder) => {
      const fullPath = path.join(extractedRoot, folder);
      return fs.statSync(fullPath).isDirectory() && folder.startsWith(`${id}_`);
    })
    .slice(0, 50);

  const iperfData = [];

  for (const folder of matchingFolders) {
    const folderPath = path.join(extractedRoot, folder);

    const subdirs = fs
      .readdirSync(folderPath)
      .filter((name) => fs.statSync(path.join(folderPath, name)).isDirectory());

    let dataPath = folderPath;
    if (subdirs.length > 0) {
      dataPath = path.join(folderPath, subdirs[0]);
    }

    const iperfFile = path.join(dataPath, "iperf_results.txt");

    if (fs.existsSync(iperfFile)) {
      const content = fs.readFileSync(iperfFile, "utf-8");
      const lines = content.trim().split("\n");

      // Find the last line that starts with '[  3]'
      const avgLine = [...lines]
        .reverse()
        .find((line) => line.startsWith("[  3]") && line.includes("sec"));

      let bandwidth = null;
      let unit = null;
      if (avgLine) {
        const parts = avgLine.trim().split(/\s+/);
        bandwidth = parseFloat(parts[parts.length - 2]); // returns 57.9
        unit = parts[parts.length - 1]; // e.g., Mbits/sec
      }

      iperfData.push({
        uid: id,
        timestamp: folder.split("_")[1],
        bandwidth,
        unit,
      });
    }
  }

  res.json(iperfData);
});

app.get("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const extractedRoot = "extracted";

  const matchingFolders = fs
    .readdirSync(extractedRoot)
    .filter((folder) => {
      const fullPath = path.join(extractedRoot, folder);
      return fs.statSync(fullPath).isDirectory() && folder.startsWith(`${id}_`);
    })
    .slice(0, 50);

  const eventStats = [];

  for (const folder of matchingFolders) {
    const folderPath = path.join(extractedRoot, folder);

    const subdirs = fs
      .readdirSync(folderPath)
      .filter((name) => fs.statSync(path.join(folderPath, name)).isDirectory());

    let dataPath = folderPath;
    if (subdirs.length > 0) {
      dataPath = path.join(folderPath, subdirs[0]);
    }

    const eventFile = path.join(dataPath, "events_statistics.txt");

    if (fs.existsSync(eventFile)) {
      const content = fs.readFileSync(eventFile, "utf-8");
      const lines = content.trim().split("\n");

      const data = {
        uid: id,
        timestamp: folder.split("_")[1],
      };

      for (const line of lines) {
        if (line.startsWith("Smartlocks count")) {
          const match = line.match(
            /Smartlocks count:\s*(\d+),.*online:\s*(\d+),.*offline:\s*(\d+),.*moving:\s*(\d+),.*busy:\s*(\d+)/
          );
          if (match) {
            data.totalSmartlocks = parseInt(match[1]);
            data.online = parseInt(match[2]);
            data.offline = parseInt(match[3]);
            data.moving = parseInt(match[4]);
            data.busy = parseInt(match[5]);
          }
        }

        if (line.startsWith("Events count")) {
          const match = line.match(/Events count:\s*(\d+)/);
          if (match) data.totalEvents = parseInt(match[1]);
        }

        if (line.startsWith("Low battery results count")) {
          const match = line.match(/Low battery results count:\s*(\d+)/);
          if (match) data.lowBattery = parseInt(match[1]);
        }

        if (line.startsWith("Malfunction results count")) {
          const match = line.match(/Malfunction results count:\s*(\d+)/);
          if (match) data.malfunction = parseInt(match[1]);
        }

        if (line.startsWith("Average RX power")) {
          const match = line.match(/Average RX power:\s*(-?\d+)/);
          if (match) data.avgRX = parseInt(match[1]);
        }

        if (line.startsWith("Average TX power")) {
          const match = line.match(/Average TX power:\s*(-?\d+)/);
          if (match) data.avgTX = parseInt(match[1]);
        }

        if (line.startsWith("Average battery level")) {
          const match = line.match(/Average battery level:\s*(\d+)/);
          if (match) data.avgBatteryLevel = parseInt(match[1]);
        }

        if (line.startsWith("Alarms count")) {
          const match = line.match(/Alarms count:\s*(\d+)/);
          if (match) data.alarms = parseInt(match[1]);
        }
      }

      eventStats.push(data);
    }
  }

  res.json(eventStats);
});

// Static web page on server
app.use(express.static(path.join(__dirname, "dist")));

// Serve index.html for all other routes (for SPA)
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server + WebSocket running on port ${PORT}`);
});

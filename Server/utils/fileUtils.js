import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import { fileURLToPath } from "url";

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract ZIP to a specific folder
export async function extractZip(zipPath, uid) {
  const timestamp = Date.now();
  const extractDir = path.join("extracted", `${uid}_${timestamp}`);

  // Ensure the extracted folder exists
  fs.mkdirSync(extractDir, { recursive: true });

  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractDir }))
    .promise();

  return extractDir;
}

// Return parsed contents of extracted directory
export async function parseExtractedData(folderPath = "extracted") {
  try {
    if (!fs.existsSync(folderPath)) return [];

    const allDirs = fs
      .readdirSync(folderPath)
      .filter((name) => fs.statSync(path.join(folderPath, name)).isDirectory());

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
        .slice(0, 24);

      for (const { dir } of sortedDirs) {
        const fullPath = path.join(folderPath, dir);

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

    return allData;
  } catch (err) {
    console.error("parseExtractedData failed:", err);
    return [];
  }
}

// Parse iperf.txt inside extracted/[id]/
export function parseIperf(id) {
  const extractedRoot = path.join(__dirname, "..", "extracted");

  const matchingFolders = fs
    .readdirSync(extractedRoot)
    .filter((folder) => {
      const fullPath = path.join(extractedRoot, folder);
      return fs.statSync(fullPath).isDirectory() && folder.startsWith(`${id}_`);
    })
    .slice(0, 50); // most recent 50

  const iperfData = [];

  for (const folder of matchingFolders) {
    const folderPath = path.join(extractedRoot, folder);

    let dataPath = folderPath;
    const subdirs = fs
      .readdirSync(folderPath)
      .filter((name) => fs.statSync(path.join(folderPath, name)).isDirectory());
    if (subdirs.length > 0) {
      dataPath = path.join(folderPath, subdirs[0]);
    }

    const iperfFile = path.join(dataPath, "iperf_results.txt");
    if (!fs.existsSync(iperfFile)) continue;

    const content = fs.readFileSync(iperfFile, "utf-8");
    const lines = content.trim().split("\n");

    // Find last "[  3]" line with bandwidth info
    const avgLine = [...lines]
      .reverse()
      .find((line) => line.startsWith("[  3]") && line.includes("sec"));

    let bandwidth = null;
    let unit = null;

    if (avgLine) {
      const parts = avgLine.trim().split(/\s+/);
      bandwidth = parseFloat(parts[parts.length - 2]); // e.g., 57.9
      unit = parts[parts.length - 1]; // e.g., Mbits/sec
    }

    iperfData.push({
      uid: id,
      timestamp: folder.split("_")[1],
      bandwidth,
      unit,
    });
  }

  return iperfData;
}

// Parse events.txt inside extracted/[id]/
export function parseEventStats(id) {
  const extractedRoot = path.join(__dirname, "..", "extracted");

  const matchingFolders = fs
    .readdirSync(extractedRoot)
    .filter((folder) => {
      const fullPath = path.join(extractedRoot, folder);
      return fs.statSync(fullPath).isDirectory() && folder.startsWith(`${id}_`);
    })
    .slice(0, 50);

  const results = [];

  for (const folder of matchingFolders) {
    const [uid, timestamp] = folder.split("_");
    const folderPath = path.join(extractedRoot, folder);

    // Check if there's a subdirectory (sometimes data is nested)
    let dataPath = folderPath;
    const subdirs = fs
      .readdirSync(folderPath)
      .filter((name) => fs.statSync(path.join(folderPath, name)).isDirectory());
    if (subdirs.length > 0) {
      dataPath = path.join(folderPath, subdirs[0]);
    }

    const statsFile = path.join(dataPath, "events_statistics.txt");
    if (!fs.existsSync(statsFile)) continue;

    const lines = fs.readFileSync(statsFile, "utf-8").trim().split("\n");

    const data = { uid, timestamp };

    for (const line of lines) {
      if (line.startsWith("Smartlocks count")) {
        const match = line.match(
          /Smartlocks count:\s*(\d+),.*online:\s*(\d+),.*offline:\s*(\d+),.*moving:\s*(\d+),.*busy:\s*(\d+)/
        );
        if (match) {
          data.totalSmartlocks = +match[1];
          data.online = +match[2];
          data.offline = +match[3];
          data.moving = +match[4];
          data.busy = +match[5];
        }
      }

      if (line.startsWith("Events count")) {
        const match = line.match(/Events count:\s*(\d+)/);
        if (match) data.totalEvents = +match[1];
      }

      if (line.startsWith("Low battery results count")) {
        const match = line.match(/Low battery results count:\s*(\d+)/);
        if (match) data.lowBattery = +match[1];
      }

      if (line.startsWith("Malfunction results count")) {
        const match = line.match(/Malfunction results count:\s*(\d+)/);
        if (match) data.malfunction = +match[1];
      }

      if (line.startsWith("Average RX power")) {
        const match = line.match(/Average RX power:\s*(-?\d+)/);
        if (match) data.avgRX = +match[1];
      }

      if (line.startsWith("Average TX power")) {
        const match = line.match(/Average TX power:\s*(-?\d+)/);
        if (match) data.avgTX = +match[1];
      }

      if (line.startsWith("Average battery level")) {
        const match = line.match(/Average battery level:\s*(\d+)/);
        if (match) data.avgBatteryLevel = +match[1];
      }

      if (line.startsWith("Alarms count")) {
        const match = line.match(/Alarms count:\s*(\d+)/);
        if (match) data.alarms = +match[1];
      }
    }

    results.push(data);
  }

  return results;
}

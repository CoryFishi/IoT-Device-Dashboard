import {
  extractZip,
  parseExtractedData,
  parseIperf,
  parseEventStats,
} from "../utils/fileUtils.js";

export const uploadZip = async (req, res) => {
  const uid = req.body.uid || req.query.uid || req.headers["x-device-uid"];
  if (!req.file || !uid)
    return res.status(400).json({ message: "Missing file or UID" });

  try {
    const folder = await extractZip(req.file.path, uid);
    const files = await parseExtractedData(folder);
    res.json({ message: "Upload and extraction complete", uid, folder, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload or extraction failed" });
  }
};

export const getUploads = async (req, res) => {
  try {
    const data = await parseExtractedData("extracted");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to load extracted data." });
  }
};
export const getIperfData = (req, res) => {
  try {
    const data = parseIperf(req.params.id);
    res.json(data);
  } catch (err) {
    console.error("Failed to parse iperf:", err);
    res.status(500).json({ message: "Failed to parse iperf data." });
  }
};

export const getEventStats = (req, res) => {
  try {
    const data = parseEventStats(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to parse event statistics." });
  }
};

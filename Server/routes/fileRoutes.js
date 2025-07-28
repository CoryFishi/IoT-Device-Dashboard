import express from "express";
import upload from "../middleware/upload.js";
import {
  uploadZip,
  getUploads,
  getIperfData,
  getEventStats,
} from "../controllers/fileController.js";
import fs from "fs";
import { mqttClient, pendingAcks } from "../mqtt.js";
import multer from "multer";

const router = express.Router();

router.post("/upload-zip", upload.single("zipFile"), uploadZip);
router.get("/uploads", getUploads);
router.get("/iperf/:id", getIperfData);
router.get("/events/:id", getEventStats);

router.get("/mqtt/logs", (req, res) => {
  try {
    const logs = fs.readFileSync("mqtt_logs.json", "utf-8");
    res.json(JSON.parse(logs));
  } catch {
    res.status(500).json({ message: "Failed to read logs" });
  }
});

router.get("/mqtt/uids", (req, res) => {
  try {
    const uids = fs.readFileSync("device_uids.json", "utf-8");
    res.json(JSON.parse(uids));
  } catch {
    res.status(500).json({ message: "Failed to read device UIDs" });
  }
});

router.get("/mqtt/:uid", (req, res) => {
  try {
    const { uid } = req.params;
    const uids = fs.readFileSync("device_uids.json", "utf-8");
    const devices = JSON.parse(uids);
    const device = devices[uid];
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    return res.status(200).json({ [uid]: device });
  } catch {
    res.status(500).json({ message: "Failed to read device UIDs" });
  }
});

router.put("/mqtt/:uid/relay/:num/:state", async (req, res) => {
  try {
    const { uid, num, state } = req.params;

    if (
      !["1", "2", "3", "4", "all"].includes(num) ||
      !["on", "off"].includes(state)
    ) {
      return res.status(400).json({ message: "Invalid relay number or state" });
    }

    const uids = fs.readFileSync("device_uids.json", "utf-8");
    const devices = JSON.parse(uids);
    const device = devices[uid];
    if (!device) return res.status(404).json({ message: "Device not found" });

    // Update local state
    if (num === "all") {
      device.relay1 = state;
      device.relay2 = state;
      device.relay3 = state;
      device.relay4 = state;
    } else {
      device[`relay${num}`] = state;
    }

    const statePayload = JSON.stringify({
      uid,
      model: device.model,
      relay1: device.relay1,
      relay2: device.relay2,
      relay3: device.relay3,
      relay4: device.relay4,
    });

    const topic = `${uid}/state`;

    // Setup ack wait via status/UID
    const ackPromise = new Promise((resolve, reject) => {
      pendingAcks.set(uid, resolve);
      setTimeout(() => {
        pendingAcks.delete(uid);
        reject(new Error("Timeout waiting for device acknowledgment"));
      }, 3000);
    });

    mqttClient.publish(topic, statePayload, async (err) => {
      if (err) {
        console.error("MQTT publish error:", err);
        return res
          .status(500)
          .json({ message: "Failed to publish MQTT message" });
      }

      try {
        const ack = await ackPromise;
        return res.status(200).json({
          message: `Device ${uid} acknowledged relay ${num} = ${state}`,
          ack: JSON.parse(ack),
        });
      } catch (ackErr) {
        return res.status(202).json({
          message: `Published to device ${uid}, but no acknowledgment received`,
        });
      }
    });
  } catch (err) {
    console.error("Publish route error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Set up storage with original extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    const filename = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, filename);
  },
});

const uploaded = multer({ storage });

router.post("/image", uploaded.single("file"), (req, res) => {
  console.log("Image uploaded:", req.file?.filename);
  res
    .status(200)
    .json({ message: "Image received", filename: req.file?.filename });
});

export default router;

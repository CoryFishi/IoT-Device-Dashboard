import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import connectDB from "./config/db.js";
import fileRoutes from "./routes/fileRoutes.js";
import "./mqtt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use("/api", fileRoutes);
app.use("/images", express.static("uploads/images"));

// Static SPA
app.use(express.static(path.join(__dirname, "dist")));
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

export default app;

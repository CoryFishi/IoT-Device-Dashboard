import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
dotenv.config();

const PORT = 3000;
const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

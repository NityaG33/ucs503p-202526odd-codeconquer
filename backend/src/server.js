import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initOraclePool } from "./db/oracle.js";

import noRoute from "./routes/no.js";          // default import
import summary from "./routes/summary.js";
import wastage from "./routes/wastage.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () =>
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`)
  );
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/exports", express.static(path.resolve(__dirname, "../exports")));

app.use("/api/no", noRoute);
app.use("/api/summary", summary);
app.use("/api/wastage", wastage);

app.get("/", (_, res) => res.send("Mess backend (NO-only) running ✅"));

initOraclePool().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`✅ Server http://localhost:${port}`));
}).catch(e => {
  console.error("DB pool init failed:", e);
  process.exit(1);
});

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, "dist");

// Serve static assets with long cache
app.use("/assets", express.static(join(DIST, "assets"), {
  maxAge: "1y",
  immutable: true,
}));

// Serve other static files (favicon, robots.txt, etc.)
app.use(express.static(DIST, { index: false }));

// ALL routes → index.html (SPA fallback)
app.get("*", (_req, res) => {
  res.sendFile(join(DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Coursevia frontend running on port ${PORT}`);
});

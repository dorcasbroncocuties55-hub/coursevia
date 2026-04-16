import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, "dist");

// Serve static assets with long cache
app.use(
  "/assets",
  express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  })
);

// Serve everything else in dist as static (favicon, images, etc.)
app.use(express.static(distPath, { maxAge: "0" }));

// SPA fallback — ALL unmatched routes serve index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

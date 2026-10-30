import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./src/server/app";
import { ensureDatabaseInitialized } from "./src/server/db";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await ensureDatabaseInitialized();

  if (process.env.NODE_ENV !== "production") {
    console.log("🚀 Starting THAMJJ13 server in DEVELOPMENT mode (Turso + Cloudinary + Resend)...");
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("🚀 Starting THAMJJ13 server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ THAMJJ13 Enterprise Platform listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("❌ CRITICAL SERVER LAUNCH FAILURE:", err);
  process.exit(1);
});

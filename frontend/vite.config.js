import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const isAdminDev = process.env.npm_lifecycle_event === "dev:admin";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "admin-dev-root",
      configureServer(server) {
        if (!isAdminDev) return;
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/" || req.url?.startsWith("/?")) {
            req.url = "/admin.html";
          }
          next();
        });
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html")
      }
    }
  }
});

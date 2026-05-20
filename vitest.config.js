import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootNodeModules = path.resolve(__dirname, "node_modules");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react$/,
        replacement: path.join(rootNodeModules, "react"),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.join(rootNodeModules, "react/jsx-runtime.js"),
      },
      {
        find: /^react-dom$/,
        replacement: path.join(rootNodeModules, "react-dom"),
      },
      {
        find: /^react-dom\/client$/,
        replacement: path.join(rootNodeModules, "react-dom/client.js"),
      },
    ],
    dedupe: ["react", "react-dom"],
  },

  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },

  test: {
    environment: "node",
    include: [
      "backend/**/*.test.js",
      "frontend/src/**/*.test.jsx",
      "frontend/src/**/*.test.js",
    ],
    globals: true,
    clearMocks: true,
  },
});

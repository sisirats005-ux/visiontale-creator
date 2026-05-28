/**
 * Vite Configuration — VisionTale Creator
 *
 * FIX: Replaced @lovable.dev/vite-tanstack-config wrapper with a standard,
 * portable Vite config. The Lovable wrapper hard-codes host "::" and port 8080
 * with strictPort: true, which fails outside the Lovable sandbox.
 *
 * We use @tanstack/react-start/plugin/vite for full SSR + server functions support.
 * This replaces the @tanstack/router-plugin alone, which only handles routing but
 * not server function RPC — createServerFn requires the Start plugin.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    // Full TanStack Start (includes routing + createServerFn RPC)
    tanstackStart(),
    // React fast refresh + JSX transform
    react(),
    // Tailwind v4
    tailwindcss(),
    // @ path alias from tsconfig.json
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
});

// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Set NITRO_PRESET=vercel environment variable when deploying to Vercel
export default defineConfig({
  nitro: {
    preset: process.env.NITRO_PRESET || "vercel",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});

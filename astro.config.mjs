import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  // Update this after your first deploy, or leave blank for local dev.
  site: "https://example.netlify.app",
});

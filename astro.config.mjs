import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [react(), mdx()],
  // Update this after your first deploy, or leave blank for local dev.
  site: "https://example.netlify.app",
});

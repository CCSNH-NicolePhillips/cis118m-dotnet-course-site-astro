import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";

export default defineConfig({
  integrations: [react(), mdx()],
  output: 'hybrid',
  adapter: netlify(),
  // Update this after your first deploy, or leave blank for local dev.
  site: "https://example.netlify.app",
});

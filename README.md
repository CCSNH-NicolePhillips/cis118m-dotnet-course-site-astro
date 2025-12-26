# CIS118M Intro to .NET — Course Site (Astro + Netlify)

This is the course website that Canvas links to for weekly "Read / Review" pages.

## Local dev
1) Install Node 18+
2) Install dependencies:
   npm install
3) Run dev server:
   npm run dev
4) Open:
   http://localhost:4321

## Netlify deploy
- Build command: `npm run build`
- Publish directory: `dist`

## Editing content
All weekly pages live under:
`src/pages/week-XX/`

Update the editor link when Step 5 is ready:
`src/config/site.ts` → `COURSE.editorUrl`

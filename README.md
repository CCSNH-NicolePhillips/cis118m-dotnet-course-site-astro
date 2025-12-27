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

## Deployment

### Frontend (Netlify)
- Build command: `npm run build`
- Publish directory: `dist`
- Do NOT set `PUBLIC_RUNNER_URL` environment variable (leave empty for proxy approach)

### Backend Runner (.NET)
The `cis118m-dotnet-runner` must be deployed separately to a platform that supports .NET 8.0:
- **Railway** (recommended): https://railway.app
- **Fly.io**: https://fly.io
- **Azure App Service**
- **Render**: https://render.com

#### Deploying the runner:
1. Deploy the `cis118m-dotnet-runner` directory to your chosen platform
2. The runner automatically binds to the `$PORT` environment variable
3. Set `ALLOWED_ORIGINS` environment variable to include your Netlify domain (e.g., `https://your-site.netlify.app`)
4. Verify deployment by visiting `https://your-runner-url/health` (should return `{"ok":true}`)

#### Connecting Netlify to the runner:
1. Open `netlify.toml` in your repository
2. Replace `RUNNER_HOST` in all `[[redirects]]` entries with your deployed runner URL
   - Example: Change `https://RUNNER_HOST/health` to `https://your-runner.railway.app/health`
3. Commit and push the change
4. Netlify will now proxy `/compile`, `/run`, `/check`, and `/health` to your runner

#### Testing:
1. Visit your Netlify site and navigate to `/editor`
2. Write a simple program (e.g., `Console.WriteLine("Hello!");`)
3. Click "Run" to test the runner connection
4. Click "Run Checks" to test the feedback system

## Editing content
All weekly pages live under:
`src/pages/week-XX/`

Update the editor link when Step 5 is ready:
`src/config/site.ts` → `COURSE.editorUrl`

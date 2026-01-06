# CIS118M .NET Course Site - Session Summary
**Date:** January 5, 2026  
**Project:** cis118m-dotnet-course-site-astro

---

## 🎯 What We Built This Session

### 1. AI-Powered Homework Grading (Gemini)
- **File:** `netlify/functions/ai-grade.mjs`
- Uses Gemini 2.0 Flash to grade student reflections
- Lesson-specific grading contexts in `netlify/functions/_lib/lesson-contexts.mjs`
- Returns JSON with score (0-100), feedback, and strengths/improvements
- Stores grades in Upstash Redis

### 2. AI Tutor - "Senior Engineer" Chat
- **Files:** 
  - `netlify/functions/ai-tutor.mjs` (API)
  - `src/components/AITutor.tsx` (React component)
- Floating chat button (💬) in bottom-right corner
- **Socratic method** - never gives direct answers
- Uses "Blueprint vs Engine" analogy for .NET concepts
- Personalized with student names from Auth0
- **Final prompt includes:**
  - Typo tolerance (ignores spelling errors)
  - No repetition (moves forward when concept is understood)
  - Direct hit recognition (CLR, Common Language Runtime = immediate success)
  - Success signal: "📡 MISSION OBJECTIVE CONFIRMED"

### 3. Instructor Dashboard
- **Files:**
  - `src/pages/instructor/index.astro` (dashboard)
  - `netlify/functions/instructor-progress.mjs` (API)
- Auth-protected: only `@ccsnh.edu` emails can access
- Shows all student progress with completion percentages
- Inline "VIEW ANALYSIS" expands to show AI grading feedback
- Displays student email, name, and scores

### 4. Auth0 Integration Fixes
- **File:** `netlify/functions/_lib/auth0-verify.mjs`
- Fixed: Email not in JWT token → now fetches from userinfo endpoint
- Fixed: Name not showing → checks `name`, `nickname`, `given_name` fields
- Fixed: Expired token handling → graceful re-login prompts

---

## 📦 Key Commits (Recent → Oldest)

```
a6dc3ea - Refine AI Tutor: typo tolerance, no repetition, cleaner guidance
2642651 - Add Direct Hit protocol - recognize correct answers immediately
b61152c - Fix AI Tutor to not show email as name
15a1194 - Personalize AI Tutor with student names
ffdbae5 - Fix syntax error in EngineeringLogEditor
9257529 - Update AITutor styling - COMMS_LINK_V1 theme
0863d0f - Add AI Tutor (Senior Engineer) floating chat
50f47fc - Handle expired auth session gracefully
9e71ed8 - Add student name to instructor dashboard
293a0c0 - Change VIEW ANALYSIS from popup to inline expandable
761ae42 - Fetch email from Auth0 userinfo endpoint
69f812f - Handle missing access token gracefully
d0d99b9 - Add logging to debug auth email issue
b83a71e - Fix instructor auth checks and imports
06ccecf - Fix instructor dashboard domain check
b766b12 - Add instructor dashboard link to sidebar
82cec63 - Fix variable name conflict (context → lessonContext)
cf29dfa - Fix StarterKit config (history included by default)
874b948 - Fix ai-grade ESM module format
c59788a - Add AI-powered homework grading with Gemini
e9c321e - Fix: Use Render runner instead of fake API
0d9b38b - Fix: Add /api/compile-and-run redirect
```

---

## 💰 Pricing & API Costs

### Gemini 2.0 Flash (Google AI)
Used for both AI grading and AI tutoring.

| Feature | Token Limit | Est. Cost |
|---------|-------------|-----------|
| AI Grading | 250 output tokens max | ~$0.0001/request |
| AI Tutor | 300 output tokens max | ~$0.00012/request |

**Gemini 2.0 Flash Pricing (as of Jan 2026):**
- Input: $0.10 per 1M tokens
- Output: $0.40 per 1M tokens
- **Very low cost** - suitable for educational use

### Upstash Redis
- Storing student progress, grades, code saves
- Free tier: 10,000 requests/day
- Pay-as-you-go after that

### Render.com (Code Runner)
- Hosting the .NET code execution Docker container
- Free tier available, but may have cold starts

---

## ⚠️ Known Issues

1. **AI Tutor Name Display** - Fixed email showing instead of name by checking for `@` in name field
2. **Repetitive Looping** - AI would repeat analogies even after correct answers → Fixed with "Direct Hit" protocol
3. **Token Expiration** - Auth tokens expire and cause errors → Added graceful re-login prompts
4. **Instructor Auth** - Initially used constant-based check → Changed to domain-based (`@ccsnh.edu`)

---

## 🗂️ File Structure (Key Files)

```
netlify/functions/
├── ai-grade.mjs          # Gemini grading API
├── ai-tutor.mjs          # Gemini tutoring API
├── instructor-progress.mjs
├── instructor-grades.mjs
├── compile-and-run.mjs   # Proxies to Render code runner
└── _lib/
    ├── auth0-verify.mjs  # JWT verification + userinfo
    ├── lesson-contexts.mjs
    └── redis.mjs

src/components/
├── AITutor.tsx           # Floating chat component
├── EngineeringLogEditor.tsx  # Homework editor with Tiptap
└── progress/

src/pages/
├── instructor/
│   ├── index.astro       # Dashboard
│   └── grades.astro
└── week-01/ through week-16/
```

---

## 🔧 Environment Variables Needed

```env
GEMINI_API_KEY=your-google-ai-key
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
AUTH0_DOMAIN=dev-xxx.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=your-api-audience
```

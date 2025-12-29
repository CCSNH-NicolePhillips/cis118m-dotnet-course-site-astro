# Week 1 Module - Deployment Checklist

## ✅ Completed

Week 1 is now a complete ~3.5-hour self-contained module with:

### Pages Created/Updated
- ✅ **Lesson 1** - Updated with DeepDiveTabs + 3 inline TryItNowRunner editors
- ✅ **Lesson 2** - Updated with 3 inline TryItNowRunner editors  
- ✅ **Extra Practice** - 8 micro coding drills with inline runners
- ✅ **Lab 1** - Welcome Program with submission functionality
- ✅ **Homework** - Reflection + code change with submission
- ✅ **Required Quiz** - Completion quiz (3 questions)
- ✅ **Start Here** - Replaced with comprehensive 60-min version

### Components
- ✅ **DeepDiveTabs** - Gemini-style tabbed interface (keyboard navigable)
- ✅ **TryItNowRunner** - Inline Monaco editor with run/reset

### Backend APIs
- ✅ **compile-and-run.mjs** - Execute C# code inline
- ✅ **submit-lab.mjs** - Save lab submissions to Redis
- ✅ **submit-homework.mjs** - Save homework + reflection to Redis
- ✅ **submit-quiz.mjs** - Save quiz answers to Redis
- ✅ **get-submission.mjs** - Retrieve previous submissions

### Tests
- ✅ **tests/week-01.test.js** - Test structure for all components and APIs

---

## 🚨 Required: Environment Variables for Netlify

Before this will work on Netlify, you **must** add these environment variables in Netlify:

### Site Settings → Environment Variables

```bash
# Upstash Redis (required for submissions)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Auth0 (required for authentication)
AUTH0_DOMAIN=dev-xxxx.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret  # Only if server functions need it
AUTH0_AUDIENCE=https://cis118m-api  # Your API audience
AUTH0_REDIRECT_URI=https://your-site.netlify.app/callback
```

### Where to Find These Values

**Upstash Redis:**
1. Go to https://console.upstash.com/
2. Select your Redis database
3. Copy the REST URL and REST TOKEN

**Auth0:**
1. Go to https://manage.auth0.com/
2. Applications → Your Application
3. Copy Domain, Client ID, Client Secret
4. APIs → Your API → Copy the API Identifier (Audience)

---

## 🔧 Configuration Notes

### Auth0 Setup

The site currently uses **Auth0 SPA SDK** with forced login. Make sure:

1. **Allowed Callback URLs** includes your Netlify URL + `/callback`
2. **Allowed Logout URLs** includes your Netlify URL
3. **Allowed Web Origins** includes your Netlify URL
4. **Application Type** is set to "Single Page Application"

### Redis Key Structure

Submissions are stored with these keys:

```
submissions:{userId}:week01:lab       → Lab submission JSON
submissions:{userId}:week01:homework  → Homework submission JSON
submissions:{userId}:week01:quiz      → Quiz submission JSON
submissions:index:week01              → SET of all userIds who submitted
```

### External Compilation API

The `compile-and-run.mjs` function calls:
```
POST https://cis118m-api.netlify.app/compile
```

Make sure this API is:
- ✅ Deployed and accessible
- ✅ Accepts `{ code, stdin, timeout }` as JSON body
- ✅ Returns `{ success, output, error, diagnostics, exitCode }`

If the URL is different, update line 41 in `netlify/functions/compile-and-run.mjs`.

---

## 🧪 Testing as a Student (After Deploy)

1. **Log in** to the site with Auth0
2. **Navigate to Week 1**
3. **Test each page:**

### Lesson 1 (50 min)
- [ ] DeepDiveTabs render and switch correctly
- [ ] 3 inline code editors load Monaco
- [ ] Click "Run" executes code and shows output
- [ ] Output panel expands/collapses
- [ ] Errors display nicely

### Lesson 2 (45 min)
- [ ] 3 inline code editors work
- [ ] Can edit code and run
- [ ] Reset button works

### Extra Practice (25 min)
- [ ] All 8 micro drills load and run
- [ ] Can fix errors in error-fixing drills

### Lab 1 (45 min)
- [ ] Editor loads with starter code
- [ ] Can run code
- [ ] "Submit Lab" button works
- [ ] Shows "Last submitted: [timestamp]" after submit
- [ ] Refresh page → timestamp persists
- [ ] Resubmit works (updates timestamp)

### Homework (15 min)
- [ ] Reflection textarea accepts input
- [ ] Editor loads
- [ ] Can run code
- [ ] "Submit Homework" button works
- [ ] Validates reflection (minimum length)
- [ ] Shows last submitted timestamp
- [ ] Resubmit works

### Required Quiz (5 min)
- [ ] Radio buttons work
- [ ] Checkboxes work
- [ ] Textarea works
- [ ] "Submit Quiz" validates required fields
- [ ] Shows success message
- [ ] Shows last submitted timestamp

---

## 🐛 Common Issues and Fixes

### Issue: "Editor instance not found" error on submit

**Cause:** Monaco editor not fully initialized

**Fix:** Check that the TryItNowRunner component creates the global `window.monacoEditorInstances` object and stores the editor instance by `starterId`.

**Code to check:** `src/components/TryItNowRunner.astro` around line 350-380

---

### Issue: Submission returns 401 Unauthorized

**Causes:**
1. Auth0 token not being sent
2. JWT verification failing in backend
3. Wrong Auth0 audience

**Fix:**
1. Check browser console for auth errors
2. Verify `AUTH0_AUDIENCE` matches your API identifier
3. Check that `requireAuth` function works correctly

---

### Issue: Submissions not saving (500 error)

**Causes:**
1. Upstash Redis credentials missing/wrong
2. Network issue reaching Redis
3. Redis key format error

**Fix:**
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Netlify
2. Test Redis connection with a simple SET/GET operation
3. Check Netlify function logs for detailed error messages

---

### Issue: Code won't execute (compile-and-run fails)

**Causes:**
1. External compilation API is down
2. Wrong API URL
3. Timeout or network issue

**Fix:**
1. Test the compilation API directly with curl/Postman:
   ```bash
   curl -X POST https://cis118m-api.netlify.app/compile \
     -H "Content-Type: application/json" \
     -d '{"code":"using System; class Program { static void Main() { Console.WriteLine(\"Test\"); } }", "stdin":"", "timeout":10}'
   ```
2. If URL is wrong, update `netlify/functions/compile-and-run.mjs` line 41
3. Check Netlify function logs

---

### Issue: Monaco editor not loading

**Causes:**
1. Monaco files not in `/public/monaco/vs/`
2. Path issue in TryItNowRunner
3. CSP blocking Monaco

**Fix:**
1. Verify Monaco files exist at `/public/monaco/vs/loader.js` and `/public/monaco/vs/editor/editor.main.js`
2. Check browser console for 404 errors
3. If using Content Security Policy, allow `script-src 'unsafe-eval'` for Monaco

---

## 📊 Monitoring Student Progress (Instructor View)

To see all submissions for Week 1:

1. **Get list of students who submitted:**
   ```javascript
   // In Redis
   SMEMBERS submissions:index:week01
   // Returns: ["auth0|123", "auth0|456", ...]
   ```

2. **Get a specific student's lab submission:**
   ```javascript
   // In Redis
   GET submissions:auth0|123:week01:lab
   // Returns: JSON with code, timestamp, etc.
   ```

3. **Get a specific student's homework:**
   ```javascript
   GET submissions:auth0|123:week01:homework
   // Returns: JSON with code, reflection, timestamp
   ```

4. **Get a specific student's quiz:**
   ```javascript
   GET submissions:auth0|123:week01:quiz
   // Returns: JSON with answers, completed: true
   ```

You may want to create an instructor dashboard page that:
- Lists all students who submitted
- Shows submission timestamps
- Allows viewing/grading submissions
- Filters by week/assignment type

---

## 🎨 Placeholder Image

There's a placeholder SVG at:
```
/public/img/week1/csharp-dotnet-diagram.jpg
```

**Replace with actual diagram showing:**
- C# as the language (blueprint)
- .NET as the platform (construction site)
- Or: Execution flow diagram (source → IL → CLR → output)

**Recommended tools:**
- Excalidraw (https://excalidraw.com/)
- Figma
- Draw.io

**Dimensions:** 800x400px or larger (responsive)

---

## 🧪 Running Tests

Tests are structured but not fully implemented. To run:

```bash
npm test
```

Current tests are placeholders. To implement:

1. Install Astro testing utilities:
   ```bash
   npm install -D @astrojs/test-utils
   ```

2. Mock fetch for API tests
3. Mock Redis for submission tests
4. Use JSDOM for component tests

---

## 📝 Next Steps After Testing

Once you've confirmed everything works:

1. **Create Week 2** following the same pattern:
   - Lesson 1 & 2 with inline runners
   - Extra Practice drills
   - Lab, Homework, Required Quiz
   - Update submission APIs to support `week02`

2. **Add Progress Tracking:**
   - Mark lessons/labs as "completed" in sidebar
   - Use existing progress API or extend it

3. **Create Instructor Dashboard:**
   - View all submissions
   - Grade assignments
   - Export to CSV for Canvas import

4. **Enhance Inline Editors:**
   - Add "Copy to Full Editor" button
   - Save code automatically to Redis (autosave)
   - Show code from previous session on page load

---

## 🙋 Questions?

If something doesn't work:

1. **Check Netlify function logs** (Site → Functions → View logs)
2. **Check browser console** (F12 → Console tab)
3. **Verify environment variables** are set correctly
4. **Test APIs individually** with curl/Postman

The architecture is:
```
Student Browser
  ↓ (Auth0 JWT)
Netlify Function (submit-lab, submit-homework, etc.)
  ↓ (requireAuth verifies JWT)
  ↓ (writes to)
Upstash Redis (submissions:userId:week:type)
```

And for code execution:
```
Student Browser
  ↓ (Auth0 JWT + code)
Netlify Function (compile-and-run)
  ↓ (forwards to)
External Compilation API (cis118m-api.netlify.app)
  ↓ (returns)
{ success, output, error, diagnostics }
```

---

## ✨ What Makes Week 1 Special

Students can now:
- ✅ **Learn entirely on your site** (no external editor required)
- ✅ **Run code inline** as they read lessons
- ✅ **Submit all assignments** from the site
- ✅ **See their progress** (last submitted timestamps)
- ✅ **Resubmit** as many times as needed
- ✅ **Access keyboard shortcuts** (Ctrl+Enter to run)
- ✅ **Use dark/light mode** with Monaco theme sync

**Total time:** ~3.5 hours of guided learning + practice + assignments

This is a **complete online learning module** with no dependencies on external tools!

---

## 🎉 You're Ready!

1. Add environment variables to Netlify
2. Deploy and test as a student
3. Fix any issues
4. Open Week 1 to students!

Good luck! 🚀

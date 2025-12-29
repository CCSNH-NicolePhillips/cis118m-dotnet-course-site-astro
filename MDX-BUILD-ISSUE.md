# MDX Build Issue - Inline Scripts

## Problem

MDX parser cannot handle inline `<script>` tags with certain JavaScript syntax, even with `is:inline` directive:
- Single/double quotes in strings are parsed as JSX
- Curly braces `{}` are interpreted as JSX expressions
- Arrow functions `=>` cause parsing issues

## Affected Files

1. `src/pages/week-01/homework/index.mdx` - Line 90+ (script tag)
2. `src/pages/week-01/lab-1/index.mdx` - Line 120+ (script tag)  
3. `src/pages/week-01/required-quiz/index.md` - Line 140+ (script tag)

Also:
- Any page with `<TryItNowRunner code={\`...\`} />` - template literals with curly braces fail

## Solutions

### Option 1: Convert to .astro format (RECOMMENDED)

Convert `.mdx` files to `.astro` and wrap markdown content properly:

```astro
---
import CourseLayout from '../../../layouts/CourseLayout.astro';
import TryItNowRunner from '../../../components/TryItNowRunner.astro';

const frontmatter = {
  title: "Week 01 • Homework",
  description: "Week 1 Homework"
};
---

<CourseLayout {...frontmatter}>
  <h1>Homework: Lab Reflection</h1>
  
  <!-- All markdown content as HTML -->
  
  <script is:inline>
    // Scripts work fine in .astro files
    document.addEventListener('DOMContentLoaded', async () => {
      const btn = document.getElementById('submit-homework-btn');
      // All JavaScript works normally here
    });
  </script>
</CourseLayout>
```

### Option 2: External Script Files

Move all scripts to external `.js` files:

```html
<script is:inline src="/scripts/homework-submission.js"></script>
```

### Option 3: Use Astro's client directives

Use Astro components with `client:load`:

```astro
<SubmissionForm client:load starterId="week-01-homework" />
```

### Option 4: Fix TryItNowRunner Props

Convert all template literal code props to escaped strings:

```jsx
// BEFORE (fails)
<TryItNowRunner
  code={`using System;
class Program {}`}
/>

// AFTER (works)
<TryItNowRunner
  code={'using System;\nclass Program {}'}
/>
```

## Immediate Workaround

For now, the submission pages can:
1. Remove inline editors (link to full editor instead)
2. Move scripts to end of file after all markdown
3. Use simple HTML forms without client-side validation

## Files That Need Fixing

Run this to find all problematic patterns:

```powershell
# Find template literal code props
Select-String -Path "src/pages/week-01/**/*.{md,mdx}" -Pattern "code=\{\`"

# Find inline scripts
Select-String -Path "src/pages/week-01/**/*.{md,mdx}" -Pattern "<script"
```

## Next Steps

1. Convert homework/lab/quiz pages to `.astro` format
2. OR remove inline editors from submission pages (students use full editor)
3. Fix all TryItNowRunner calls in lesson pages to use escaped strings
4. Test local build before pushing

---

**Status:** Build currently fails on homework/index.mdx line 90.  
**Priority:** High - blocks deployment  
**Estimated fix time:** 30-60 minutes to convert 3 pages to .astro format

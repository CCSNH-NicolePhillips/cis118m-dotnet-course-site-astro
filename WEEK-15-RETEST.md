# Week 15 Retest

Date: 2026-05-03

## Additional Changes

- Kept the previously completed Week 15 policy updates in place: the class closes on Saturday, May 9, and the recovery-window alert still states that missing work from Weeks 01-14 may be submitted for up to 70% credit.
- Replaced the rejected single-deliverable Week 15 model with two visible submission surfaces that follow the earlier week format:
  - `src/pages/week-15/homework/index.mdx` is now a homework-style Written Final page using `EngineeringLogEditor` with `assignmentId="week-15-homework"`.
  - `src/pages/week-15/final-project/index.mdx` is now a lab-style Final Project page using `TryItNowRunner` plus a visible submit button.
- Updated `public/scripts/submit-lab.js` and `src/components/TryItNowRunner.astro` so the coding final can reuse the existing lab submission pipeline while recording against `week-15-final`.
- Updated student grades, instructor grades, Canvas export, AI tutor logic, and lesson contexts so both `week-15-homework` and `week-15-final` count in the Final category.
- Preserved legacy handling by mapping old `week-15-lab` progress forward to `week-15-final`.
- Updated Week 15 overview and navigation copy so students now see `Written Final (Graded)` and `Final Project (Graded)`, with no Week 15 quiz and no separate Week 15 lab grading bucket.
- Restored the Week 15 written final and final project pages to the same homework/lab layout patterns used in earlier weeks:
  - `src/pages/week-15/homework/index.mdx` now uses the standard homework page structure with `DueDateBanner`, the reflection prompt, the architect note, and the shared `EngineeringLogEditor` wording.
  - `src/pages/week-15/final-project/index.mdx` now uses the standard lab page structure with `DueDateBanner`, integrity protocol, mission objective, technical requirements, starter code, rubric, and submission sections.
- Fixed the Week 15 final-project feedback regression in `public/scripts/submit-lab.js` so lab-style pages now render the returned feedback panel even when the server response does not include an immediate numeric score.

## Validation

- Ran `npm test -- tests/grade-tracking.test.js`.
- Result: passed, 22/22 tests green, including Week 15 assignment-id coverage for `week-15-homework` and `week-15-final`.
- Ran `npm run build`.
- Result: passed and regenerated:
  - `netlify/functions/_lib/course-content.json`
  - `netlify/functions/_lib/course-summary.txt`
  - `netlify/functions/_lib/course-summary.mjs`
- Validated `public/scripts/submit-lab.js` with workspace diagnostics after the no-score feedback fix.
- Verified built Week 15 output includes the restored student-facing strings:
  - `dist/week-15/homework/index.html` contains `Homework 15: Written Final - Deployment Readiness Reflection`.
  - `dist/week-15/final-project/index.html` contains `Submit Final Project` and the expected `data-starter-id="week-15-final"` plus `data-submission-type="final"` metadata.
  - `dist/week-15/index.html` contains `Week 15 Grading Model`.
- Verified the shared written-assignment editor wording was restored so Week 15 uses the same `Submit for Review` and `Technical Review Feedback` language as the other written assignments.
- Verified built navigation includes `Written Final (Graded)` and `Final Project (Graded)` for Week 15.
- Noted an existing unrelated CSS minifier warning from `src/components/DeepDiveTabs.astro` during build; no Week 15 validation failed because of it.

## Result

- Week 15 now matches the established weekly structure instead of hiding submission pages.
- The Week 15 written final and coding final now follow the same homework/lab layout patterns as the earlier graded assignments.
- Students have a visible written final submission page and a visible coding final submission page.
- The lab-style submission flow now shows returned feedback even when grading falls back to a no-score response, instead of silently showing only "submitted successfully".
- Both Week 15 deliverables resolve to the Final category across the student dashboard, instructor dashboard, Canvas export, and tutor/progress logic.
- The May 9 class close date, recovery-window notice, and no-quiz Week 15 policy remain in place.
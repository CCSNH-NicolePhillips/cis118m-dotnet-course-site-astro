# Week 15 Retest

Date: 2026-05-03

## Additional Changes

- Added a top-of-page recovery-window alert to `src/pages/week-15/index.mdx`.
- Added `WEEK-15-ARCHITECTURE-DIAGRAMS.md` with four Mermaid diagram drafts:
  - Global System Architecture
  - Class and Responsibility Map
  - Add-Record Sequence Flow
  - Verification and Failure-Boundary Map
- Corrected the Week 15 close date from May 10 to May 9 across source config, due-date helpers, runtime policy scripts, and Week 15 page copy.
- Removed the separate Week 15 lab and homework grading buckets so the final project is the only graded Week 15 deliverable.
- Deleted `src/pages/week-15/lab/index.mdx` and converted `src/pages/week-15/homework/index.mdx` into an ungraded written-final support guide.
- Updated the student grade view, instructor dashboard, Canvas export, and AI tutor context so Week 15 grades resolve to the Final Project category only.
- Added legacy fallback handling so existing Week 15 homework or lab scores still surface under `week-15-final` if they were recorded before the grading-model change.

## Validation

- Ran `npm run build` after adding the alert and diagram artifact.
- Ran `npm run build` again after correcting the Week 15 close date to May 9.
- Ran `npm test -- tests/grade-tracking.test.js` after converting Week 15 to final-project-only grading.
- Ran `npm run build` again after removing the Week 15 lab route and updating grading/tutor metadata.
- Ran a browser-backed local spot-check against the built app with mocked Auth0 and API responses to force a legacy `week-15-homework` score path through the student and instructor grade views.
- Build completed successfully.
- Verified the updated Week 15 routes were still generated, including:
  - `src/pages/week-15/index.mdx`
  - `src/pages/week-15/lesson-1/index.mdx`
  - `src/pages/week-15/lesson-2/index.mdx`
  - `src/pages/week-15/homework/index.mdx`
  - `src/pages/week-15/final-project/index.mdx`
- Verified post-build generated summaries and content metadata now show `Saturday, May 9 at 11:59 PM Eastern` and `May 04 - May 09` for Week 15.
- Verified there were no remaining `May 10` or `2026-05-10` matches in the searchable workspace after rebuild.
- Verified the focused grade-tracking test passed with Week 15 modeled as `week-15-final` only.
- Verified the rebuilt course-content index no longer includes `src/pages/week-15/lab/index.mdx`.
- Verified there were no remaining live Week 15 lab or quiz grading references outside the intentional legacy fallback keys for old Week 15 scores.
- Verified the student grade view rendered Week 15 as `Part — / Quiz — / HW — / Lab — / Final 92`, confirming the legacy Week 15 homework score resolved only to the final column.
- Verified the instructor gradebook rendered a `W15 Final Project` column and showed the legacy student's `92` there, with no Week 15 homework or lab column remaining.

## Result

- The missing-work notice is now a visible alert near the top of the Week 15 overview.
- The diagram drafts are available as a reusable instructor artifact for Week 15 planning or slide preparation.
- The Week 15 class close and submission deadline now resolve consistently to Saturday, May 9 across content, due-date logic, and regenerated tutor summaries.
- Week 15 now grades only the final project, and that score resolves to the Final Project category across the student dashboard, instructor dashboard, and Canvas export.
- The Week 15 lab route has been removed, while the written memo prompts remain available only as optional support content inside the final project package.
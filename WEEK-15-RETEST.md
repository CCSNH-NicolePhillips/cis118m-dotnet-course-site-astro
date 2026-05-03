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

## Validation

- Ran `npm run build` after adding the alert and diagram artifact.
- Ran `npm run build` again after correcting the Week 15 close date to May 9.
- Build completed successfully.
- Verified the updated Week 15 routes were still generated, including:
  - `src/pages/week-15/index.mdx`
  - `src/pages/week-15/lesson-1/index.mdx`
  - `src/pages/week-15/lesson-2/index.mdx`
  - `src/pages/week-15/lab/index.mdx`
  - `src/pages/week-15/homework/index.mdx`
  - `src/pages/week-15/final-project/index.mdx`
- Verified post-build generated summaries and content metadata now show `Saturday, May 9 at 11:59 PM Eastern` and `May 04 - May 09` for Week 15.
- Verified there were no remaining `May 10` or `2026-05-10` matches in the searchable workspace after rebuild.

## Result

- The missing-work notice is now a visible alert near the top of the Week 15 overview.
- The diagram drafts are available as a reusable instructor artifact for Week 15 planning or slide preparation.
- The Week 15 class close and submission deadline now resolve consistently to Saturday, May 9 across content, due-date logic, and regenerated tutor summaries.
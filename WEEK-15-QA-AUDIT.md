# Week 15 QA Audit

Date: 2026-05-03

## Scope

- Replaced the Week 15 placeholder markdown slice with MDX capstone content focused on system integration.
- Added a dedicated final project page for Week 15.
- Updated Week 15 navigation, tutor context, and cross-links to use "The Final Deployment" framing.
- Removed the Week 15 quiz from the student and instructor grade dashboards.
- Updated the Week 15 recovery-window policy from a 75 cap to a 70 cap for recovered Weeks 01-14 assignments and quizzes.
- Removed orphaned Week 16 placeholder pages so generated course context matches the live 15-week course.

## Validation

- Ran `npm run build` after the main Week 15 patch.
- Ran `npm run build` again after removing orphaned Week 16 pages.
- Verified the second build reported `Total weeks: 15` and included the new Week 15 pages:
  - week-15/index.mdx
  - week-15/lesson-1/index.mdx
  - week-15/lesson-2/index.mdx
  - week-15/lab/index.mdx
  - week-15/homework/index.mdx
  - week-15/extra-practice/index.mdx
  - week-15/final-project/index.mdx

## Results

- Week 15 now presents a professional capstone week with no quiz.
- Recovery-window messaging and cap logic now align to the Weeks 01-14 at 70 percent policy.
- Course-content generation no longer indexes a fake Week 16.

## Residual Warning

- `npm run build` still reports a pre-existing CSS minifier warning involving `outline-offset: 4px` in bundled styles.
- The warning did not block the build, and it did not prevent the Week 15 pages or generated course context from compiling successfully.
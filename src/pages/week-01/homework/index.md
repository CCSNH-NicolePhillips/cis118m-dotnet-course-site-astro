---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 - Homework"
description: "About-Me Console Card"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import MarkCompleteButton from "../../../components/progress/MarkCompleteButton";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="01" slug="homework" client:load />

# Homework: About-Me Console Card

## Overview
Create a short console "about me" card using 5-7 lines of output.

## Requirements
- Include a title line (e.g., "About Me").
- Print your name, major or goal, and one hobby/interest.
- Add at least one blank line for spacing.
- Add one comment describing the program.
- Keep it to 5-7 lines total.

## Submission
- Paste your final code and a screenshot of the output into Canvas.

<a class="button" href={editorUrl("01", "lesson-1")}>Open in Editor (Week 1 starter)</a>

<MarkCompleteButton week="01" slug="homework" client:load />

<ProgressBadge week="01" client:load />

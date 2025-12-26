---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 - Homework"
description: "Personal budget snapshot"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import MarkCompleteButton from "../../../components/progress/MarkCompleteButton";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="02" slug="homework" client:load />

# Homework: Personal budget snapshot

## Overview
Print a short budget summary with totals and clean formatting.

## Requirements
- Declare income and at least three expense categories (doubles).
- Compute total expenses and remaining balance.
- Print each line with labels and two-decimal formatting.
- Add one comment describing the program.

## Submission
- Paste your final code and a screenshot of the output into Canvas.

<a class="button" href={editorUrl("02", "lesson-1")}>Open in Editor (Week 2 starter)</a>

<MarkCompleteButton week="02" slug="homework" client:load />

<ProgressBadge week="02" client:load />

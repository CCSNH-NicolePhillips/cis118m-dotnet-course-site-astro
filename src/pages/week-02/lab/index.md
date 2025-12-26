---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 - Lab"
description: "Mini calculator"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import MarkCompleteButton from "../../../components/progress/MarkCompleteButton";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="02" slug="lab" client:load />

# Lab: Mini calculator

## Overview
Build a tiny calculator that adds, subtracts, multiplies, and divides two numbers.

## Requirements
- Declare two `double` variables (pick any values).
- Compute sum, difference, product, and quotient.
- Print each result with clear labels and two decimals.
- Include one comment describing what the program does.

## Submission
- Paste your final code and a screenshot of the output into Canvas.

<a class="button" href={editorUrl("02", "lesson-1")}>Open in Editor (Week 2 starter)</a>

<MarkCompleteButton week="02" slug="lab" client:load />

<ProgressBadge week="02" client:load />

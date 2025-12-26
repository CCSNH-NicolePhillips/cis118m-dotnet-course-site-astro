---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 - Lab"
description: "Hello, .NET lab"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import MarkCompleteButton from "../../../components/progress/MarkCompleteButton";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="01" slug="lab" client:load />

# Lab: Hello, .NET

## Overview
Run the starter, change the output, and add a comment so you can prove you edited and ran the code.

## Requirements
- Open the starter in the browser editor or local IDE.
- Change one line to print your name.
- Add a second `Console.WriteLine` with a new message.
- Add one C# comment (`//`) explaining what the program does.
- Run it and confirm the output shows both lines.

## Submission
- Paste your final code and a screenshot of the output into Canvas.

<a class="button" href={editorUrl("01", "lesson-1")}>Open in Editor (Week 1 starter)</a>

<MarkCompleteButton week="01" slug="lab" client:load />

<ProgressBadge week="01" client:load />

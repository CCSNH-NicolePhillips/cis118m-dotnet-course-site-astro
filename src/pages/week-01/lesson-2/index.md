---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 - Lesson 2"
description: "Console app structure and entry point"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="01" slug="lesson-2" client:load />

# Console app structure and entry point

## Goal
- See where code starts executing
- Know what files matter in a new console project
- Run and re-run after edits

## What to know
- **Program.cs**: default file that hosts top-level statements in .NET 6+ templates.
- **Entry point**: the first code that runs; top-level statements replace the old `static void Main`.
- **Build vs run**: build compiles, run executes the compiled output.
- **Console.WriteLine**: prints a line to the terminal.

## Examples
```csharp
// Program.cs
Console.WriteLine("Starting app...");
Console.WriteLine("Doing some work...");
Console.WriteLine("Done.");
```

## Try it
- Add a line before the first WriteLine; predict the order of output.
- Change the text to include your name and the current year.
- Add a blank line using `Console.WriteLine("");` and see how spacing changes.

## Common mistakes
- Editing a different file than the one the project runs.
- Forgetting to rebuild/re-run after changes.
- Leaving out semicolons at the end of statements.

## Mini-check
- What is the difference between building and running?
<details>
<summary>Show answer</summary>
Building compiles the code; running executes the compiled output.
</details>

## Next
- <a class="button" href={editorUrl("01", "lesson-2")}>
    Open in Editor (Week 1 Lesson 2)
  </a>
- <a class="button-ghost" href="../extra-practice/">Next: Extra practice</a>

<ProgressBadge week="01" client:load />

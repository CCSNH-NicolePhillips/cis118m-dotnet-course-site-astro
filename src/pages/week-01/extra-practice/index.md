---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 - Extra Practice"
description: "Optional practice for Week 1"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="01" slug="extra-practice" client:load />

# Extra practice: Hello, .NET refinements

## Goal
- Get comfortable editing and re-running a console app
- Practice adding multiple output lines
- Reinforce entry point understanding

## What to know
- You can add as many `Console.WriteLine` calls as you want.
- The order of lines in code matches the order of output.
- Empty strings create blank lines for spacing.

## Examples
```csharp
Console.WriteLine("--- About Me ---");
Console.WriteLine("Name: Taylor");
Console.WriteLine("Goal: Learn .NET");
Console.WriteLine("");
Console.WriteLine("Thanks for reading!");
```

## Try it
- Add a header and footer line around your output.
- Insert a blank line between sections.
- Change one line to include the current date or year.

## Common mistakes
- Copy/pasting quotes that are curly instead of straight ASCII quotes.
- Forgetting to save before running.
- Leaving extra spaces that change alignment.

## Mini-check
- How do you add a blank line to the output?
<details>
<summary>Show answer</summary>
Use `Console.WriteLine("");` to print an empty line.
</details>

## Next
- <a class="button" href={editorUrl("01", "extra-practice")}>
    Open in Editor (Week 1 Extra Practice)
  </a>
- <a class="button-ghost" href="../lab/">Go to Lab</a>

<ProgressBadge week="01" client:load />

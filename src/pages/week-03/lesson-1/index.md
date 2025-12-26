---
layout: ../../../layouts/CourseLayout.astro
title: "Week 03 - Lesson 1"
description: "Reading input with Console.ReadLine"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="03" slug="lesson-1" client:load />

# Input: prompts and Console.ReadLine

## Goal
- Prompt the user for input
- Capture text from `Console.ReadLine`
- Convert input to a number

## What to know
- `Console.Write` shows a prompt without a newline; `Console.WriteLine` adds one.
- `Console.ReadLine()` returns a string (or null).
- Convert with `int.Parse`/`double.Parse` or safer `TryParse`.

## Examples
```csharp
Console.Write("Enter your name: ");
string? name = Console.ReadLine();
Console.WriteLine($"Hi {name}!\n");

Console.Write("Enter your age: ");
string? ageText = Console.ReadLine();
int age = int.Parse(ageText ?? "0");
Console.WriteLine($"Next year you will be {age + 1}.");
```

## Try it
- Change the prompt text to be more specific.
- Ask for a favorite color and echo it back.
- Add an empty line between prompts for readability.

## Common mistakes
- Not handling null/empty input.
- Using `WriteLine` when you meant `Write`, leading to prompts on new lines.
- Parsing a non-number without validation (use TryParse in Lesson 2).

## Mini-check
- What does `Console.ReadLine` return when the user just presses Enter?
<details>
<summary>Show answer</summary>
An empty string (or null); treat it as input that needs validation.
</details>

## Next
- <a class="button" href={editorUrl("03", "lesson-1")}>
    Open in Editor (Week 3 Lesson 1)
  </a>
- <a class="button-ghost" href="../lesson-2/">Next: TryParse + validation</a>

<ProgressBadge week="03" client:load />

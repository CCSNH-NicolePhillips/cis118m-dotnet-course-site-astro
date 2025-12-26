---
layout: ../../../layouts/CourseLayout.astro
title: "Week 03 - Lesson 2"
description: "TryParse and validation loop"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="03" slug="lesson-2" client:load />

# TryParse and validation

## Goal
- Validate numeric input safely
- Use `TryParse` to avoid crashes
- Loop until valid input is provided

## What to know
- `int.TryParse(input, out int value)` returns true/false and sets `value`.
- A `while (!TryParse)` loop keeps prompting until valid.
- Trim input to avoid accidental spaces.

## Examples
```csharp
int score;
while (true)
{
    Console.Write("Enter a score (0-100): ");
    string? text = Console.ReadLine();
    if (int.TryParse(text, out score) && score >= 0 && score <= 100)
    {
        break;
    }
    Console.WriteLine("Please enter a whole number between 0 and 100.\n");
}

Console.WriteLine($"Thanks! You entered: {score}");
```

## Try it
- Change the range to 110 and update the message.
- Convert the loop to `do { } while`.
- Add a second prompt for age and reuse the pattern.

## Common mistakes
- Calling `Parse` directly on unknown input (can throw exceptions).
- Forgetting to reset the loop or provide feedback.
- Not handling blank input.

## Mini-check
- What does `TryParse` return on bad input?
<details>
<summary>Show answer</summary>
It returns false and leaves the output variable unchanged (default value).
</details>

## Next
- <a class="button" href={editorUrl("03", "lesson-2")}>
    Open in Editor (Week 3 Lesson 2)
  </a>
- <a class="button-ghost" href="../extra-practice/">Next: Extra practice</a>

<ProgressBadge week="03" client:load />

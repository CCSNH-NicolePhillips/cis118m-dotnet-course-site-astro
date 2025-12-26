---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 - Lesson 2"
description: "Printing values with labels and formatting"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="02" slug="lesson-2" client:load />

# Printing values (labels + formatting)

## Goal
- Print readable output with labels
- Use interpolation and format specifiers
- Keep numbers clean and consistent

## What to know
- Interpolation: `$"Name: {name}"`.
- Format numbers: `{price:F2}` for two decimals.
- Combine text and values to make output self-explanatory.

## Examples
```csharp
double subtotal = 18.5;
double tax = subtotal * 0.06;
double total = subtotal + tax;

Console.WriteLine($"Subtotal: ${subtotal:F2}");
Console.WriteLine($"Tax (6%): ${tax:F2}");
Console.WriteLine($"Total: ${total:F2}");
```

## Try it
- Add another line for a discount and subtract it from total.
- Change tax to 8% and re-run.
- Align labels by keeping them similar length.

## Common mistakes
- Forgetting the `$` before strings that contain `{}` placeholders.
- Using too many decimals (or none) on money values.
- Typos in variable names inside interpolation braces.

## Mini-check
- How do you print a price with two decimals?
<details>
<summary>Show answer</summary>
Use interpolation with a format specifier, e.g., `$"Price: ${price:F2}"`.
</details>

## Next
- <a class="button" href={editorUrl("02", "lesson-2")}>
    Open in Editor (Week 2 Lesson 2)
  </a>
- <a class="button-ghost" href="../extra-practice/">Next: Extra practice</a>

<ProgressBadge week="02" client:load />

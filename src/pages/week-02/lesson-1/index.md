---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 - Lesson 1"
description: "Variables and data types"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="02" slug="lesson-1" client:load />

# Variables and data types

## Goal
- Declare and initialize variables
- Use string, int, double, and bool
- Pick readable names

## What to know
- **string** for text, **int** for whole numbers, **double** for decimals, **bool** for true/false.
- Variables must be declared before use.
- Interpolation ($"...") inserts values into strings.

## Examples
```csharp
string name = "Avery";
int age = 20;
double gpa = 3.6;
bool isFullTime = true;

Console.WriteLine($"Name: {name}");
Console.WriteLine($"Age: {age}");
Console.WriteLine($"GPA: {gpa:F1}");
Console.WriteLine($"Full time: {isFullTime}");
```

## Try it
- Change the values to your own and rerun.
- Add a new bool that tracks if you have programming experience.
- Add a double for hours studied and print it with one decimal place.

## Common mistakes
- Forgetting to initialize variables before printing them.
- Using the wrong type (e.g., `int` for 3.14).
- Mismatched braces or quotes in interpolation strings.

## Mini-check
- Which type would you use for "3.14"? Why?
<details>
<summary>Show answer</summary>
Use `double` because it stores decimal numbers; int only stores whole numbers.
</details>

## Next
- <a class="button" href={editorUrl("02", "lesson-1")}>
    Open in Editor (Week 2 Lesson 1)
  </a>
- <a class="button-ghost" href="../lesson-2/">Next: Output formatting</a>

<ProgressBadge week="02" client:load />

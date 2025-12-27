---
layout: ../../../layouts/CourseLayout.astro
title: "Week 16 • Lesson 1"
description: "Week 16 Lesson 1: Finishing strong (testing + polish)"
---

# Week 16 Lesson 1: Finishing strong (testing + polish)

## Goal
- Run through a test checklist before submitting
- Handle common edge cases (empty input, not found, invalid numbers)
- Make output readable for grading

## What to know
- **Edge cases**: Empty, 0, negative, large numbers, not found, file missing.
- **Happy path**: The normal case where everything goes right.
- **Polish**: Small improvements that make the app easier to use and grade.

## Examples
```csharp
// Example: friendly not-found handling
if (found == null)
{
    Console.WriteLine("No match found. Check the ID and try again.");
}
```

```csharp
// Example: menu loop skeleton
while (true)
{
    Console.WriteLine("1) Add  2) List  3) Search  4) Save  5) Quit");
    string choice = Console.ReadLine();

    if (choice == "5") break;
    // else call methods
}
```

## Try it
- Write a ‘grading-friendly’ demo script (what inputs you’ll type to show features).
- Add clear labels to your output.
- Run 6 test cases including at least 2 edge cases.

## Common mistakes
- Only testing one path (the happy path).
- Submitting without running the program one last time.
- Output that’s hard to follow (no labels).

## Mini-check
**1) Name two edge cases you should test for a search feature.**

<details>
<summary>Show answer</summary>

Search for an ID that exists and one that doesn’t; also try empty input or extra spaces.

</details>

## Next
- Go to Lesson 2: [Final submission checklist](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=16&starter=week-16-lesson-1)

<a href="/editor/?week=16&starter=week-16-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



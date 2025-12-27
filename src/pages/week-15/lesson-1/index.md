---
layout: ../../../layouts/CourseLayout.astro
title: "Week 15 • Lesson 1"
description: "Week 15 Lesson 1: Review map (what tool solves what problem?)"
---

# Week 15 Lesson 1: Review map (what tool solves what problem?)

## Goal
- Know when to use loops, lists, methods, and classes
- Practice reading code and predicting output
- Build a personal ‘cheat sheet’ of patterns

## What to know
- **Loop**: Repeat work (while for retry, for for counting).
- **List**: Store many items and add/remove.
- **Method**: Reuse and test behavior.
- **Class**: Model real things with data + behavior.
- **File**: Persist data between runs.

## Examples
```csharp
// Pattern: input + TryParse + loop
int n;
while (true)
{
    Console.WriteLine("Enter a number:");
    if (int.TryParse(Console.ReadLine(), out n)) break;
    Console.WriteLine("Try again.");
}
Console.WriteLine($"You entered {n}.");
```

```csharp
// Pattern: list of objects + foreach
List<Student> roster = new List<Student>();
// ... add students
foreach (Student s in roster)
{
    Console.WriteLine(s.Summary());
}
```

## Try it
- Pick 3 patterns (input validation, searching, stats) and write them in your own words.
- Predict the output of a small loop (then run it to confirm).
- Refactor one old program to be cleaner using methods/classes.

## Common mistakes
- Trying to do everything at once (break into steps).
- Copy/pasting without understanding (change one thing and observe).
- Skipping the ‘plan’ step for the final project (it saves time).

## Mini-check
**1) When would you use a List instead of an array?**

<details>
<summary>Show answer</summary>

When you need the collection to grow/shrink or you don’t know the final size.

</details>

**2) When should a method return a value instead of printing?**

<details>
<summary>Show answer</summary>

When you want it testable and reusable.

</details>

## Next
- Go to Lesson 2: [Final project planning](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=15&starter=week-15-lesson-1)

<a href="/editor/?week=15&starter=week-15-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



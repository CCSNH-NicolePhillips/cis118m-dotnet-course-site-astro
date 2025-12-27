---
layout: ../../../layouts/CourseLayout.astro
title: "Week 05 • Lesson 2"
description: "Week 5 Lesson 2: For loops (counting like a pro)"
---

# Week 5 Lesson 2: For loops (counting like a pro)

## Goal
- Write `for` loops that count up and down
- Use `for` when you know how many times to repeat
- Read a for loop out loud (so it stops being scary)

## What to know
- **for**: A loop that usually includes: start, stop condition, and change step.
- **Counter**: A variable that counts (often `i`).
- **Iteration**: One trip through the loop body.

## Examples
```csharp
for (int i = 1; i <= 5; i++)
{
    Console.WriteLine($"i is {i}");
}
```

```csharp
for (int i = 10; i >= 1; i--)
{
    Console.WriteLine(i);
}
Console.WriteLine("Blast off!");
```

## Try it
- Print all even numbers from 2 to 20.
- Print a square of stars using a loop (start with 5 stars on one line).
- Challenge: Ask the user for a number and count from 1 to that number.

## Common mistakes
- Mixing up `i++` and `i--` (counting in the wrong direction).
- Using the wrong end condition (`i < 5` vs `i <= 5`).
- Trying to use a for loop when you *don’t* know how many repeats (use while for input retry).

## Mini-check
**1) In `for (int i = 0; i < 3; i++)`, how many times does it run?**

<details>
<summary>Show answer</summary>

3 times (i = 0, 1, 2).

</details>

**2) When should you prefer a `for` loop over a `while` loop?**

<details>
<summary>Show answer</summary>

When you know the number of repeats (like counting).

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=05&starter=week-05-lesson-2)

<a href="/editor/?week=05&starter=week-05-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



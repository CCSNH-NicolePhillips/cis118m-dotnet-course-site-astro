---
layout: ../../../layouts/CourseLayout.astro
title: "Week 05 • Lesson 1"
description: "Week 5 Lesson 1: While loops (repeat until it’s done)"
---

# Week 5 Lesson 1: While loops (repeat until it’s done)

## Goal
- Understand what a loop is (and why we use it)
- Write a `while` loop that stops correctly
- Recognize an infinite loop (and fix it)

## What to know
- **Loop**: A way to repeat code.
- **Condition**: A true/false check that controls the loop.
- **while**: Repeats *while* a condition is true.
- **Infinite loop**: A loop that never ends (usually because a value never changes).

## Examples
```csharp
int count = 1;
while (count <= 5)
{
    Console.WriteLine($"Count: {count}");
    count = count + 1; // IMPORTANT: changes the value so the loop can end
}
Console.WriteLine("Done!");
```

```csharp
string answer = "";
while (answer != "yes")
{
    Console.WriteLine("Type yes to continue:");
    answer = Console.ReadLine();
}
Console.WriteLine("Thanks!");
```

## Try it
- Make a loop that prints numbers 1 to 10.
- Make a loop that keeps asking for a password until they type `letmein`.
- Add a “tries” counter to see how many attempts it took.

## Common mistakes
- Forgetting to update the loop variable (causes infinite loops).
- Using the wrong comparison (`<` vs `<=`) and getting one extra/one missing.
- Not initializing variables before the loop (like `answer`).

## Mini-check
**1) What must happen inside most while loops so they can end?**

<details>
<summary>Show answer</summary>

Something must change that affects the condition (like `count++` or reading new input).

</details>

**2) If `count` starts at 1 and the loop runs while `count < 5`, what’s the last number printed?**

<details>
<summary>Show answer</summary>

4 (because 5 is not allowed when using `< 5`).

</details>

## Next
- Go to Lesson 2: [For loops + counting patterns](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=05&starter=week-05-lesson-1)

<a href="/editor/?week=05&starter=week-05-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



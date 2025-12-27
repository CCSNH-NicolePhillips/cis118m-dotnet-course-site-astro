---
layout: ../../../layouts/CourseLayout.astro
title: "Week 12 • Lesson 1"
description: "Week 12 Lesson 1: Exceptions + try/catch (don’t let programs explode)"
---

# Week 12 Lesson 1: Exceptions + try/catch (don’t let programs explode)

## Goal
- Understand what an exception is
- Use try/catch to handle risky code
- Print helpful messages instead of crashing

## What to know
- **Exception**: A runtime error your program throws (like invalid input causing a crash).
- **try**: Wraps code that might fail.
- **catch**: Runs when an exception happens.
- **Finally (optional)**: Runs no matter what (cleanup).

## Examples
```csharp
try
{
    Console.WriteLine("Enter a number:");
    int n = int.Parse(Console.ReadLine());
    Console.WriteLine($"You typed {n}");
}
catch
{
    Console.WriteLine("That was not a valid whole number.");
}
```

```csharp
try
{
    int[] nums = { 1, 2, 3 };
    Console.WriteLine(nums[10]);
}
catch (Exception ex)
{
    Console.WriteLine("Something went wrong.");
    Console.WriteLine(ex.Message); // helpful during learning
}
```

## Try it
- Wrap a risky `int.Parse` in try/catch and print a friendly message.
- Create an array and intentionally try an invalid index to see the exception.
- Replace `Parse` with `TryParse` and notice how much cleaner it is (review).

## Common mistakes
- Using try/catch as the *first* plan (TryParse is usually better for input).
- Catching exceptions but then still crashing (keep it simple and return/retry).
- Printing scary messages to the user (use friendly language).

## Mini-check
**1) When should you prefer `TryParse` over `try/catch` for input?**

<details>
<summary>Show answer</summary>

Almost always—TryParse is designed for validation and avoids exceptions.

</details>

**2) What does a `catch` block do?**

<details>
<summary>Show answer</summary>

Runs when an exception happens, so your program can respond instead of crashing.

</details>

## Next
- Go to Lesson 2: [Thinking like a tester (Arrange–Act–Assert)](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=12&starter=week-12-lesson-1)

<a href="/editor/?week=12&starter=week-12-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



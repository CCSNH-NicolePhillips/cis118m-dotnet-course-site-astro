---
layout: ../../../layouts/CourseLayout.astro
title: "Week 04 • Lesson 2"
description: "Week 4 Lesson 2: Validation patterns (and simple boolean logic)"
---

# Week 4 Lesson 2: Validation patterns (and simple boolean logic)

## Goal
- Check if a value is in a valid range
- Use `&&` (and) and `||` (or) at a basic level
- Print helpful messages when input is invalid

## What to know
- **Range check**: Making sure a value is between two limits.
- **&& (and)**: Both conditions must be true.
- **|| (or)**: At least one condition must be true.

## Examples
```csharp
int n = 7;

if (n >= 1 && n <= 10)
    Console.WriteLine("Valid: between 1 and 10");
else
    Console.WriteLine("Invalid: must be 1–10");
```

```csharp
string answer = "y";

if (answer == "y" || answer == "yes")
    Console.WriteLine("You said yes.");
else
    Console.WriteLine("You did not say yes.");
```

## Try it
- Validate a number is between 0 and 100.
- Accept ‘y’ or ‘n’ (and print different messages).
- Combine validation with TryParse from Week 3 (optional challenge).

## Common mistakes
- Using `&` instead of `&&`.
- Not telling the user what the valid range is.
- Mixing capitalization ("Yes" vs "yes"). Keep it simple for now.

## Mini-check
**1) If `n` must be between 1 and 10, what operator connects the two checks?**

<details>
<summary>Show answer</summary>

Use `&&`: `n >= 1 && n <= 10`.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=04&starter=week-04-lesson-2)

<a href="/editor/?week=04&starter=week-04-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



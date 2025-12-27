---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Lesson 2"
description: "Week 1 Lesson 2: Console project basics (where code runs)"
---

# Week 1 Lesson 2: Console project basics (where code runs)

## Goal
- Know where your code lives in a console project
- Understand what “run” means (and what output is)
- Be able to spot the line(s) that execute first

## What to know
- **Program.cs**: The file where your code usually starts in a simple console app.
- **Run**: Build + execute your program so you can see the output.
- **Build**: Turn your C# code into something the computer can run.
- **Error**: A message that tells you what went wrong (you’ll learn to love these).

## Examples
```csharp
Console.WriteLine("Line 1");
Console.WriteLine("Line 2");
Console.WriteLine("Line 3");
// Output prints in the same order the lines run.
```

## Try it
- Reorder the 3 lines and run again. What changed?
- Add a blank line using `Console.WriteLine();`
- Make the output look like a tiny ‘profile card’ with labels (Name:, Goal:, Fun fact:).

## Common mistakes
- Assuming the computer “knows what you mean.” It only runs what you wrote.
- Ignoring error messages. Read the first one—it's usually the most important.
- Changing lots of things at once. Change one thing, run, repeat.

## Mini-check
**1) If your output prints Line 2 before Line 1, what does that mean?**

<details>
<summary>Show answer</summary>

It means the `WriteLine` for Line 2 ran first (your code order changed).

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=01&starter=week-01-lesson-2)

<a href="/editor/?week=01&starter=week-01-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



---
layout: ../../../layouts/CourseLayout.astro
title: "Week 03 • Lesson 1"
description: "Week 3 Lesson 1: Getting input (Console.ReadLine)"
---

# Week 3 Lesson 1: Getting input (Console.ReadLine)

## Goal
- Ask the user a question (a prompt)
- Read what they typed
- Store that input in a variable

## What to know
- **Prompt**: A message that tells the user what to type.
- **Console.ReadLine()**: Reads a line of text the user typed (it always starts as a string).

## Examples
```csharp
Console.WriteLine("What is your name?");
string name = Console.ReadLine();
Console.WriteLine($"Hi, {name}!");
```

## Try it
- Ask the user for their favorite food and print it back.
- Ask two questions and print both answers.
- Add labels so output is super clear.

## Common mistakes
- Forgetting that ReadLine returns a **string** (even if user typed a number).
- Not prompting clearly (user doesn’t know what to do).
- Printing the prompt and the answer on the same line by accident (keep it simple early).

## Mini-check
**1) What type is `Console.ReadLine()`?**

<details>
<summary>Show answer</summary>

It returns a `string`.

</details>

## Next
- Go to Lesson 2: [TryParse + validation](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=03&starter=week-03-lesson-1)

<a href="/editor/?week=03&starter=week-03-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



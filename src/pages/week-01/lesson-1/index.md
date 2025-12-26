---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Lesson 1"
description: "Week 1 Lesson 1: .NET vs C# (and what a “console app” is)"
---

# Week 1 Lesson 1: .NET vs C# (and what a “console app” is)

## Goal
- Know what **.NET** is (the platform) and what **C#** is (the language)
- Understand what a **console app** does
- Be able to explain this to a friend in 30 seconds

## What to know
- **C#**: The programming language you write.
- **.NET**: The platform that runs your C# code (tools + libraries + runtime).
- **Console app**: A program that talks in text (the terminal). Great for learning basics.
- **Output**: What your program prints to the screen.

## Examples
```csharp
Console.WriteLine("Hello, .NET!");
Console.WriteLine("If you can read this, your program ran.");
```

```csharp
// Comments are notes for humans.
// The computer ignores these.
Console.WriteLine("Comments are helpful!");
```

## Try it
- Change the text inside `WriteLine` to your own message.
- Add a second `Console.WriteLine` that prints your name (or a nickname).
- Add a comment above your first line that explains what it does.

## Common mistakes
- Forgetting the quotes around text.
- Missing the semicolon `;` at the end of a line.
- Typos in `Console.WriteLine` (spelling matters).

## Mini-check
**1) Is .NET a programming language?**

<details>
<summary>Show answer</summary>

No. **C#** is the language. **.NET** is the platform that runs C# programs.

</details>

**2) What does `Console.WriteLine` do?**

<details>
<summary>Show answer</summary>

It prints a line of text (output) to the console.

</details>

## Next
- Go to Lesson 2: [Console project basics](../lesson-2/)
- Open the editor: `/editor/?week=01&starter=week-01-lesson-1`

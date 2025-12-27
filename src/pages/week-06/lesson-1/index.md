---
layout: ../../../layouts/CourseLayout.astro
title: "Week 06 • Lesson 1"
description: "Week 6 Lesson 1: Methods (your code’s “superpowers”)"
---

# Week 6 Lesson 1: Methods (your code’s “superpowers”)

## Goal
- Understand what a method is
- Write and call a simple method
- Use methods to avoid copying/pasting code

## What to know
- **Method**: A named block of code you can run when you call it.
- **Call**: To run a method.
- **void**: A method that returns nothing (it just *does* something).
- **Parameter**: Information you pass into a method.

## Examples
```csharp
static void SayHello()
{
    Console.WriteLine("Hello!");
}

SayHello();
SayHello();
// Prints Hello twice without copy/paste.
```

```csharp
static void PrintLine(string message)
{
    Console.WriteLine(message);
}

PrintLine("One");
PrintLine("Two");
```

## Try it
- Create a `SayHi()` method that prints your name.
- Create a `PrintHeader(string title)` method that prints a header line.
- Call your methods from the main program at least 2 times.

## Common mistakes
- Forgetting to call the method (writing it doesn’t run it).
- Putting code in the wrong place (methods can’t be inside other methods).
- Mixing up parameters and variables (parameters are like input slots).

## Mini-check
**1) What is the main reason we use methods?**

<details>
<summary>Show answer</summary>

To organize code, reuse code, and make it easier to read/test.

</details>

**2) Does `void` return a value?**

<details>
<summary>Show answer</summary>

No. `void` methods return nothing.

</details>

## Next
- Go to Lesson 2: [Return values + clean design](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=06&starter=week-06-lesson-1)

<a href="/editor/?week=06&starter=week-06-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



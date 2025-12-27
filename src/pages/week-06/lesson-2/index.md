---
layout: ../../../layouts/CourseLayout.astro
title: "Week 06 • Lesson 2"
description: "Week 6 Lesson 2: Return values (methods that give you an answer)"
---

# Week 6 Lesson 2: Return values (methods that give you an answer)

## Goal
- Write a method that returns a value
- Use parameters + return together
- Know when to print vs return

## What to know
- **Return value**: The result a method gives back.
- **return**: Sends a value back to the caller and ends the method.
- **Pure method**: A method that just computes and returns (no printing). Great for testing.

## Examples
```csharp
static int Add(int a, int b)
{
    return a + b;
}

int total = Add(3, 4);
Console.WriteLine(total);
```

```csharp
static bool IsBetween1And10(int n)
{
    return n >= 1 && n <= 10;
}

Console.WriteLine(IsBetween1And10(7)); // True
Console.WriteLine(IsBetween1And10(20)); // False
```

## Try it
- Write `Multiply(int a, int b)` that returns the product.
- Write `IsEven(int n)` that returns true for even numbers.
- Use your methods in the main program and print the results.

## Common mistakes
- Printing inside a method that’s supposed to return a value (harder to test).
- Forgetting to return on every path (example: missing return in an if/else).
- Using the wrong return type (returning int from a bool method).

## Mini-check
**1) What’s the difference between printing and returning?**

<details>
<summary>Show answer</summary>

Printing shows something to the user. Returning gives a value back to your code.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=06&starter=week-06-lesson-2)

<a href="/editor/?week=06&starter=week-06-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



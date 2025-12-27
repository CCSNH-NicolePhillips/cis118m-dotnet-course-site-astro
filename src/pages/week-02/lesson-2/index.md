---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 • Lesson 2"
description: "Week 2 Lesson 2: Printing values clearly (string interpolation)"
---

# Week 2 Lesson 2: Printing values clearly (string interpolation)

## Goal
- Print labeled output that humans can read
- Use `$"...{variable}..."` (string interpolation)
- Avoid confusing “mystery output”

## What to know
- **Interpolation**: Put variables inside a string using `{ }`.
- **Label**: Text like `Name:` that tells the reader what a value means.

## Examples
```csharp
string name = "Jordan";
int age = 18;

Console.WriteLine($"Name: {name}");
Console.WriteLine($"Age: {age}");
```

```csharp
double price = 19.99;
int quantity = 3;
double total = price * quantity;

Console.WriteLine($"Price: {price}");
Console.WriteLine($"Quantity: {quantity}");
Console.WriteLine($"Total: {total}");
```

## Try it
- Print your variables with labels (Name:, Age:, etc.).
- Create `price` and `quantity`, calculate `total`, and print all three.
- Add a blank line between sections using `Console.WriteLine();`.

## Common mistakes
- Forgetting the `$` before the string (then `{age}` prints literally).
- Printing values without labels (the reader won’t know what 19.99 means).
- Mixing types in weird ways (like adding strings and numbers without thinking).

## Mini-check
**1) What does the `$` do in `$"Age: {age}"`?**

<details>
<summary>Show answer</summary>

It turns on interpolation so `{age}` becomes the variable’s value.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=02&starter=week-02-lesson-2)

<a href="/editor/?week=02&starter=week-02-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 • Lesson 1"
description: "Week 2 Lesson 1: Variables + data types (your program’s memory)"
---

# Week 2 Lesson 1: Variables + data types (your program’s memory)

## Goal
- Understand what a variable is (and why we use them)
- Use `string`, `int`, `double`, and `bool`
- Name variables so your code reads like a sentence

## What to know
- **Variable**: A named box that stores a value (so you can use it later).
- **string**: Text, like names or sentences.
- **int**: Whole numbers, like 0, 5, -12.
- **double**: Numbers with decimals, like 3.14 or 19.99.
- **bool**: True/false (yes/no).

## Examples
```csharp
string name = "Jordan";
int age = 18;
double gpa = 3.5;
bool likesPizza = true;

Console.WriteLine(name);
Console.WriteLine(age);
Console.WriteLine(gpa);
Console.WriteLine(likesPizza);
```

## Try it
- Create 3 variables about you: one `string`, one `int`, one `bool`.
- Change the values and re-run. What changes in output?
- Make a variable called `favoriteNumber` and print it.

## Common mistakes
- Putting quotes around numbers (that makes them text).
- Using `int` when you need decimals (use `double` for money/measurements).
- Naming variables like `x` and `y` when a real name would be clearer.

## Mini-check
**1) Which type should you use for ‘price = 19.99’?**

<details>
<summary>Show answer</summary>

Use `double` (it has decimals).

</details>

**2) Which type should you use for ‘isStudent = true’?**

<details>
<summary>Show answer</summary>

Use `bool` (true/false).

</details>

## Next
- Go to Lesson 2: [Printing with labels + interpolation](../lesson-2/)
- Open the editor: `/editor/?week=02&starter=week-02-lesson-1`

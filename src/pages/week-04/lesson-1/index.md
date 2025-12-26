---
layout: ../../../layouts/CourseLayout.astro
title: "Week 04 • Lesson 1"
description: "Week 4 Lesson 1: if/else (making decisions)"
---

# Week 4 Lesson 1: if/else (making decisions)

## Goal
- Use `if` to make a decision
- Use `else` for the ‘otherwise’ case
- Use `else if` for multiple options

## What to know
- **Condition**: A true/false question your code asks (like: is age >= 18?).
- **Comparison operators**: `>`, `<`, `>=`, `<=`, `==` (equals), `!=` (not equals).

## Examples
```csharp
int age = 17;

if (age >= 18)
{
    Console.WriteLine("Adult");
}
else
{
    Console.WriteLine("Minor");
}
```

```csharp
int score = 82;

if (score >= 90)
    Console.WriteLine("A");
else if (score >= 80)
    Console.WriteLine("B");
else if (score >= 70)
    Console.WriteLine("C");
else
    Console.WriteLine("Needs improvement");
```

## Try it
- Make a program that prints “Hot” if temp > 80, otherwise “Not hot.”
- Make a simple grade program using else-if (A/B/C/D).
- Add clear messages so the user knows what the decision means.

## Common mistakes
- Using `=` instead of `==`.
- Forgetting curly braces and getting lost (use braces early).
- Ordering else-if wrong (put bigger thresholds first).

## Mini-check
**1) What does `>=` mean?**

<details>
<summary>Show answer</summary>

It means “greater than or equal to.”

</details>

**2) Which one checks equality: `=` or `==`?**

<details>
<summary>Show answer</summary>

`==` checks equality. `=` assigns a value.

</details>

## Next
- Go to Lesson 2: [Validation patterns + boolean basics](../lesson-2/)
- Open the editor: `/editor/?week=04&starter=week-04-lesson-1`

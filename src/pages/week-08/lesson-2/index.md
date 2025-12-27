---
layout: ../../../layouts/CourseLayout.astro
title: "Week 08 • Lesson 2"
description: "Week 8 Lesson 2: foreach loops (the easiest way to read a list)"
---

# Week 8 Lesson 2: foreach loops (the easiest way to read a list)

## Goal
- Use `foreach` to visit each item
- Compute totals and counts from a list
- Build simple collection features (like a mini to-do list)

## What to know
- **foreach**: A loop that goes through each item in a collection.
- **Item variable**: The temporary name you give each item (like `todo`).

## Examples
```csharp
List<int> nums = new List<int>() { 5, 10, 15 };
int sum = 0;

foreach (int n in nums)
{
    sum += n;
}

Console.WriteLine($"Sum: {sum}");
```

```csharp
List<string> todos = new List<string>() { "Study", "Laundry" };
foreach (string t in todos)
{
    Console.WriteLine($"- {t}");
}
```

## Try it
- Print each item in a List of strings with a dash in front.
- Compute the sum of a List of ints using foreach.
- Challenge: Count how many items contain the letter 'a' (case-sensitive is okay).

## Common mistakes
- Trying to change the list size inside foreach (don’t do that yet).
- Forgetting to initialize your sum/count before the loop.
- Printing items without labels (users get confused).

## Mini-check
**1) Can you remove items from a list while using foreach?**

<details>
<summary>Show answer</summary>

Not safely (it can cause errors). Use other approaches when we get there.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=08&starter=week-08-lesson-2)

<a href="/editor/?week=08&starter=week-08-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



---
layout: ../../../layouts/CourseLayout.astro
title: "Week 08 • Lesson 1"
description: "Week 8 Lesson 1: List basics (arrays that can grow)"
---

# Week 8 Lesson 1: List basics (arrays that can grow)

## Goal
- Create a `List<T>`
- Add and remove items
- Understand when to use a list vs an array

## What to know
- **List**: A collection that can grow or shrink.
- **List<int>**: A list of integers.
- **Add / Remove**: Ways to change the list size.
- **Count**: Number of items in the list (like Length for arrays).

## Examples
```csharp
using System.Collections.Generic;

List<string> todos = new List<string>();
todos.Add("Study");
todos.Add("Workout");

Console.WriteLine($"Count: {todos.Count}");
Console.WriteLine(todos[0]);

todos.Remove("Workout");
Console.WriteLine($"Count now: {todos.Count}");
```

```csharp
List<int> nums = new List<int>() { 2, 4, 6 };
nums.Add(8);
nums.RemoveAt(0); // removes first item
Console.WriteLine(string.Join(", ", nums));
```

## Try it
- Make a List of 3 favorite movies or games, then add a 4th.
- Remove one item and print the count before and after.
- Access and print the first item (index 0).

## Common mistakes
- Forgetting `using System.Collections.Generic;` (if needed in your environment).
- Confusing `Count` (lists) with `Length` (arrays).
- Removing items while looping in a way that skips items (we’ll keep it simple this week).

## Mini-check
**1) What’s one reason to use a List instead of an array?**

<details>
<summary>Show answer</summary>

A List can grow/shrink (arrays are fixed size).

</details>

## Next
- Go to Lesson 2: [foreach + collection thinking](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=08&starter=week-08-lesson-1)

<a href="/editor/?week=08&starter=week-08-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



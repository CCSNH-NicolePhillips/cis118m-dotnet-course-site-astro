---
layout: ../../../layouts/CourseLayout.astro
title: "Week 07 • Lesson 1"
description: "Week 7 Lesson 1: Arrays + indexing (boxes in a row)"
---

# Week 7 Lesson 1: Arrays + indexing (boxes in a row)

## Goal
- Understand what an array is
- Use indexes to read and write array values
- Know why indexes start at 0

## What to know
- **Array**: A fixed-size collection of values of the same type.
- **Index**: A position number that points to an item in the array.
- **0-based**: The first item is at index 0 (not 1).
- **Length**: How many items are in the array.

## Examples
```csharp
int[] scores = { 90, 82, 77, 100 };
Console.WriteLine(scores[0]); // 90
Console.WriteLine(scores[3]); // 100

scores[1] = 85; // change the 2nd item
Console.WriteLine(scores[1]);
```

```csharp
string[] names = new string[3];
names[0] = "Ava";
names[1] = "Ben";
names[2] = "Cam";
Console.WriteLine($"Count: {names.Length}");
```

## Try it
- Make an int array of 5 numbers and print the first and last item.
- Change one item in the array and print it again.
- Make a string array of 3 favorite foods and print them.

## Common mistakes
- Using index 1 for the first item (it’s index 0).
- Going past the end (last index is `Length - 1`).
- Forgetting arrays have a fixed size (can’t just add more later).

## Mini-check
**1) If an array has Length 5, what is the last valid index?**

<details>
<summary>Show answer</summary>

4 (`Length - 1`).

</details>

**2) What happens if you try to access `scores[10]` when the array is smaller?**

<details>
<summary>Show answer</summary>

You get an error (index out of range).

</details>

## Next
- Go to Lesson 2: [Traversal patterns](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=07&starter=week-07-lesson-1)

<a href="/editor/?week=07&starter=week-07-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



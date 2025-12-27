---
layout: ../../../layouts/CourseLayout.astro
title: "Week 07 • Lesson 2"
description: "Week 7 Lesson 2: Traversing arrays (looping through items)"
---

# Week 7 Lesson 2: Traversing arrays (looping through items)

## Goal
- Use loops to process every item in an array
- Compute sum/average/min/max
- Recognize off-by-one bugs

## What to know
- **Traverse**: Visit each item in the array one by one.
- **Accumulator**: A variable that keeps a running total (like `sum`).

## Examples
```csharp
int[] nums = { 2, 4, 6, 8 };
int sum = 0;

for (int i = 0; i < nums.Length; i++)
{
    sum += nums[i];
}

Console.WriteLine($"Sum: {sum}");
```

```csharp
int[] nums = { 5, 1, 9 };
int max = nums[0];

for (int i = 1; i < nums.Length; i++)
{
    if (nums[i] > max)
        max = nums[i];
}

Console.WriteLine($"Max: {max}");
```

## Try it
- Compute the average of an int array (hint: average = sum / count).
- Count how many numbers are greater than 10 in an array.
- Challenge: Find the smallest number in an array.

## Common mistakes
- Looping with `i <= nums.Length` (should be `<`, not `<=`).
- Starting max/min wrong (use the first item, not 0 for everything).
- Doing integer division by accident (optional note: use double for precise averages).

## Mini-check
**1) Why do we loop with `i < array.Length`?**

<details>
<summary>Show answer</summary>

Because the last index is `Length - 1` and `<` stops at the right time.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=07&starter=week-07-lesson-2)

<a href="/editor/?week=07&starter=week-07-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



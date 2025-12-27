---
layout: ../../../layouts/CourseLayout.astro
title: "Week 12 • Lesson 2"
description: "Week 12 Lesson 2: Think like a tester (and design for testing)"
---

# Week 12 Lesson 2: Think like a tester (and design for testing)

## Goal
- Write methods that return values (easy to test)
- Create test cases: input → expected output
- Understand Arrange–Act–Assert (AAA)

## What to know
- **Test case**: A specific input with an expected result.
- **Edge case**: A weird/rare case that can break code (0, empty string, negative).
- **AAA**: Arrange (set up), Act (run), Assert (check result).
- **Pure method**: Returns a result without printing or reading input—perfect for tests.

## Examples
```csharp
static int Clamp(int n, int min, int max)
{
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

// Test ideas (manual):
// Clamp(5, 1, 10) => 5
// Clamp(-1, 1, 10) => 1
// Clamp(99, 1, 10) => 10
```

```csharp
static bool IsValidUsername(string username)
{
    if (username == null) return false;
    username = username.Trim();
    if (username.Length < 4 || username.Length > 12) return false;
    if (username.Contains(" ")) return false;
    return true;
}

// Test ideas:
// " Ava " => false (length 3)
// "Ava123" => true
// "Ava 123" => false (space)
```

## Try it
- Write a pure method (returns a value) for something you’ve done earlier (like score grading).
- Write 5 test cases for it (inputs + expected outputs).
- Challenge: Print a tiny ‘test report’ in the console (Passed/Failed) by comparing expected vs actual.

## Common mistakes
- Writing methods that always print instead of returning values (hard to test).
- Only testing “normal” inputs (forgetting edge cases).
- Changing your expected outputs after you see the result (don’t do that… unless you found a bug 😄).

## Mini-check
**1) Why are pure methods easier to test?**

<details>
<summary>Show answer</summary>

Because they return a value without depending on user input or printing, so results are predictable.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=12&starter=week-12-lesson-2)

<a href="/editor/?week=12&starter=week-12-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



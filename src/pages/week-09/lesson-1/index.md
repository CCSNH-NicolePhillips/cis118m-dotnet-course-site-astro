---
layout: ../../../layouts/CourseLayout.astro
title: "Week 09 • Lesson 1"
description: "Week 9 Lesson 1: Strings are tools (not just words)"
---

# Week 9 Lesson 1: Strings are tools (not just words)

## Goal
- Treat strings like data you can analyze and change
- Use `.Length`, `.Contains()`, `.ToLower()` / `.ToUpper()`
- Avoid case-sensitivity surprises

## What to know
- **string**: Text, like a name, a sentence, or an ID.
- **Length**: How many characters are in the string.
- **Contains**: Checks if a string includes another string.
- **ToLower/ToUpper**: Changes casing (useful for comparisons).
- **Trim**: Removes extra spaces at the start/end.

## Examples
```csharp
string name = "  Nicole  ";
name = name.Trim();
Console.WriteLine(name);
Console.WriteLine($"Length: {name.Length}");
```

```csharp
string word = "Programming";
Console.WriteLine(word.Contains("gram")); // True
Console.WriteLine(word.ToLower());
Console.WriteLine(word.ToUpper());
```

```csharp
string answer = "YES";
if (answer.ToLower() == "yes")
    Console.WriteLine("Accepted");
```

## Try it
- Ask the user for a name, then print it trimmed and its length.
- Ask the user for a sentence, then check if it contains the word `the` (case-insensitive).
- Ask the user for `yes` or `no` and accept `YES`, `Yes`, `yEs`, etc.

## Common mistakes
- Forgetting about leading/trailing spaces (use `Trim()`).
- Case-sensitive comparisons (`"YES" == "yes"` is false).
- Assuming Contains is case-insensitive (it isn’t).

## Mini-check
**1) What does `Trim()` remove?**

<details>
<summary>Show answer</summary>

Spaces at the start and end of the string (not spaces in the middle).

</details>

**2) Why would you use `ToLower()` before comparing?**

<details>
<summary>Show answer</summary>

So `YES`, `Yes`, and `yes` all match the same rule.

</details>

## Next
- Go to Lesson 2: [Substring + indexing basics](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=09&starter=week-09-lesson-1)

<a href="/editor/?week=09&starter=week-09-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



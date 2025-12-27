---
layout: ../../../layouts/CourseLayout.astro
title: "Week 09 • Lesson 2"
description: "Week 9 Lesson 2: Substring + indexing (carefully!)"
---

# Week 9 Lesson 2: Substring + indexing (carefully!)

## Goal
- Use `Substring` to slice text
- Understand indexing (0-based) for characters
- Avoid out-of-range errors by checking lengths

## What to know
- **Index**: Position number (starts at 0).
- **Substring(start)**: Returns everything from start to the end.
- **Substring(start, length)**: Returns a slice with a specific length.
- **Out of range**: An error when you ask for an index that doesn’t exist.

## Examples
```csharp
string s = "Hello";
Console.WriteLine(s[0]); // H
Console.WriteLine(s[4]); // o
```

```csharp
string id = "AB-12345";
string prefix = id.Substring(0, 2); // AB
string rest = id.Substring(3); // 12345
Console.WriteLine(prefix);
Console.WriteLine(rest);
```

```csharp
string text = "Hi";
if (text.Length >= 3)
{
    Console.WriteLine(text.Substring(0, 3));
}
else
{
    Console.WriteLine("Not long enough.");
}
```

## Try it
- Ask for a word. Print the first character (only if length >= 1).
- Ask for a word. Print the last character (hint: index = Length - 1).
- Challenge: If a user enters `first last`, split it into first/last using `Split(' ')` (optional).

## Common mistakes
- Trying to access `s[s.Length]` (that’s past the end; last is `Length - 1`).
- Using Substring with a length bigger than the string.
- Not checking length before slicing.

## Mini-check
**1) If a string length is 5, what is the last index?**

<details>
<summary>Show answer</summary>

4.

</details>

**2) What does `Substring(2)` do?**

<details>
<summary>Show answer</summary>

Returns the string starting at index 2 through the end.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=09&starter=week-09-lesson-2)

<a href="/editor/?week=09&starter=week-09-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



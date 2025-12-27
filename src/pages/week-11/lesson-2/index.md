---
layout: ../../../layouts/CourseLayout.astro
title: "Week 11 • Lesson 2"
description: "Week 11 Lesson 2: Searching and updating objects in a list"
---

# Week 11 Lesson 2: Searching and updating objects in a list

## Goal
- Search for an object by a property (like Id)
- Update a found object’s properties
- Handle ‘not found’ in a friendly way

## What to know
- **Linear search**: Checking each item one by one until you find a match.
- **Found flag**: A bool that tracks whether you found it.

## Examples
```csharp
Student found = null;
string targetId = "S002";

foreach (Student s in roster)
{
    if (s.Id == targetId)
    {
        found = s;
        break;
    }
}

if (found != null)
{
    Console.WriteLine("Found: " + found.Summary());
}
else
{
    Console.WriteLine("Student not found.");
}
```

```csharp
if (found != null)
{
    found.Name = "Benjamin";
    Console.WriteLine("Updated: " + found.Summary());
}
```

## Try it
- Let the user type an ID, search, and print the result.
- If found, update a property (like Name) and print again.
- If not found, print a helpful message.

## Common mistakes
- Forgetting to `break;` after finding a match (wastes time, can cause weird logic).
- Not handling the not-found case (null).
- Comparing with the wrong casing/spacing (use Trim/ToLower when needed).

## Mini-check
**1) What should you do if the search does not find anything?**

<details>
<summary>Show answer</summary>

Print a friendly message and avoid using a null object.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=11&starter=week-11-lesson-2)

<a href="/editor/?week=11&starter=week-11-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



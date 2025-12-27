---
layout: ../../../layouts/CourseLayout.astro
title: "Week 13 • Lesson 2"
description: "Week 13 Lesson 2: Simple CSV (save multiple items)"
---

# Week 13 Lesson 2: Simple CSV (save multiple items)

## Goal
- Store multiple records in one file
- Split text into parts using `Split(',')`
- Load data into objects

## What to know
- **CSV**: Comma-separated values, like `Id,Name,Major`. Simple and common.
- **Split**: Breaks a string into parts.
- **Join**: Builds a string from parts.

## Examples
```csharp
string line = "S001,Ava,CS";
string[] parts = line.Split(',');
Console.WriteLine(parts[0]); // S001
Console.WriteLine(parts[1]); // Ava
Console.WriteLine(parts[2]); // CS
```

```csharp
using System.IO;
using System.Collections.Generic;

List<string> lines = new List<string>();
lines.Add("S001,Ava,CS");
lines.Add("S002,Ben,Math");

File.WriteAllLines("students.csv", lines);

string[] loaded = File.ReadAllLines("students.csv");
foreach (string l in loaded)
{
    Console.WriteLine(l);
}
```

## Try it
- Save 3 ‘student lines’ to a file with WriteAllLines.
- Load them and print them.
- Challenge: Turn each line into a Student object (Id, Name, Major).

## Common mistakes
- Not handling commas inside data (we’ll avoid that in this intro).
- Assuming every line has the correct number of parts (validate length).
- Reading a file that doesn’t exist (check first).

## Mini-check
**1) What does `Split(',')` return?**

<details>
<summary>Show answer</summary>

A string array of the pieces between commas.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=13&starter=week-13-lesson-2)

<a href="/editor/?week=13&starter=week-13-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



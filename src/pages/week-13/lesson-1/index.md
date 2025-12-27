---
layout: ../../../layouts/CourseLayout.astro
title: "Week 13 • Lesson 1"
description: "Week 13 Lesson 1: Reading and writing files (your program gets memory)"
---

# Week 13 Lesson 1: Reading and writing files (your program gets memory)

## Goal
- Write text to a file
- Read text from a file
- Understand relative paths (where the file goes)

## What to know
- **File**: Data stored on disk (like a .txt).
- **I/O**: Input/Output: reading and writing.
- **Path**: Where the file lives.
- **Relative path**: A path relative to your program folder.

## Examples
```csharp
using System.IO;

string path = "notes.txt";
File.WriteAllText(path, "Hello file!");
Console.WriteLine("Saved.");

string contents = File.ReadAllText(path);
Console.WriteLine("Loaded: " + contents);
```

```csharp
string path = "data.txt";
if (File.Exists(path))
{
    string contents = File.ReadAllText(path);
    Console.WriteLine(contents);
}
else
{
    Console.WriteLine("No file yet. That is okay.");
}
```

## Try it
- Save your name to a file, then load it and print it.
- Try running the program twice and notice the file stays there.
- Add `File.Exists` so the first run doesn’t crash.

## Common mistakes
- Assuming the file is in the same folder as your code file (it’s in the run folder).
- Forgetting `using System.IO;`.
- Not checking for missing file before reading.

## Mini-check
**1) Why check `File.Exists(path)` before reading?**

<details>
<summary>Show answer</summary>

To avoid errors if the file is missing.

</details>

## Next
- Go to Lesson 2: [Simple CSV data storage](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=13&starter=week-13-lesson-1)

<a href="/editor/?week=13&starter=week-13-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



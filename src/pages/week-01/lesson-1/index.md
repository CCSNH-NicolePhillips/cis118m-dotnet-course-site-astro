---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 - Lesson 1"
description: "What is .NET? What is C#?"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="01" slug="lesson-1" client:load />

# What is .NET vs C#?

## Goal
- Know the difference between the platform (.NET) and the language (C#)
- See what a console app is and where it runs
- Recognize the entry point of a simple program

## What to know
- **.NET**: the runtime + libraries that execute your code on many platforms.
- **C#**: the programming language you write; compiles to run on .NET.
- **Console app**: text-based program that runs in a terminal window.
- **Entry point**: the first instructions the runtime executes (top-level statements act as `Main`).

## Examples
```csharp
// Top-level statements act as the Main entry point
Console.WriteLine("Hello, .NET!");
Console.WriteLine("This is my first C# program.");
```

## Try it
- Run the sample and change the second line to introduce yourself.
- Add one more `Console.WriteLine` with a fun fact.
- Swap the order of the lines and predict the output.

## Common mistakes
- Mixing up .NET (platform) with C# (language).
- Forgetting quotes around strings.
- Changing a file but running an older build.

## Mini-check
- What does .NET provide that C# does not?
<details>
<summary>Show answer</summary>
.NET provides the runtime and base libraries; C# is the language targeting that runtime.
</details>

## Next
- <a class="button" href={editorUrl("01", "lesson-1")}>
    Open in Editor (Week 1 Lesson 1)
  </a>
- <a class="button-ghost" href="../lesson-2/">Next: Console app structure</a>

<ProgressBadge week="01" client:load />

---
layout: ../../../layouts/CourseLayout.astro
title: "Week 03 • Lesson 2"
description: "Week 3 Lesson 2: Converting input safely (TryParse + retry loop)"
---

# Week 3 Lesson 2: Converting input safely (TryParse + retry loop)

## Goal
- Convert user input to a number without crashing
- Use `TryParse` to check if conversion worked
- Re-prompt if the input is invalid

## What to know
- **Parsing**: Turning text into a number.
- **TryParse**: A safe way to parse that tells you if it worked (true/false).
- **Validation loop**: A loop that keeps asking until input is valid.

## Examples
```csharp
Console.WriteLine("Enter a whole number:");
string text = Console.ReadLine();

int number;
bool ok = int.TryParse(text, out number);

if (ok)
{
    Console.WriteLine($"You entered: {number}");
}
else
{
    Console.WriteLine("That was not a whole number.");
}
```

```csharp
int value;
while (true)
{
    Console.WriteLine("Enter your age (whole number):");
    string input = Console.ReadLine();

    if (int.TryParse(input, out value))
        break;

    Console.WriteLine("Try again. Please type a whole number (like 18).");
}

Console.WriteLine($"Age saved: {value}");
```

## Try it
- Ask for an age and keep asking until the input is valid.
- Switch to `double.TryParse` and ask for a price.
- Print a friendly message when the input is invalid.

## Common mistakes
- Using `int.Parse` (it crashes if input is not a number).
- Forgetting `out number` in TryParse.
- Not telling the user what “valid” means (whole number? decimal allowed?).

## Mini-check
**1) What does TryParse return when parsing fails?**

<details>
<summary>Show answer</summary>

It returns `false`.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=03&starter=week-03-lesson-2)

<a href="/editor/?week=03&starter=week-03-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



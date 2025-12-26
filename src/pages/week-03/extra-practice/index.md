---
layout: ../../../layouts/CourseLayout.astro
title: "Week 03 - Extra Practice"
description: "Optional practice for Week 3"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="03" slug="extra-practice" client:load />

# Extra practice: Input + echoes

## Goal
- Prompt for multiple inputs
- Reuse TryParse to validate numbers
- Echo results with labels

## What to know
- You can nest prompts and validations back-to-back.
- Reusing the same pattern reduces bugs.

## Examples
```csharp
Console.Write("Enter a whole number: ");
string? text = Console.ReadLine();
if (int.TryParse(text, out int n))
{
    Console.WriteLine($"You typed {n} and its double is {n * 2}.");
}
else
{
    Console.WriteLine("Not a valid whole number.");
}
```

## Try it
- Prompt for two numbers; print their sum and product.
- Add a guard that warns when input is empty.
- Ask for a word and print its length.

## Common mistakes
- Forgetting to handle empty strings.
- Not resetting variables between prompts.
- Using `Parse` instead of `TryParse` on user input.

## Mini-check
- What does `TryParse` give you besides true/false?
<details>
<summary>Show answer</summary>
It also outputs the parsed value through the `out` variable when it succeeds.
</details>

## Next
- <a class="button" href={editorUrl("03", "extra-practice")}>
    Open in Editor (Week 3 Extra Practice)
  </a>
- <a class="button-ghost" href="../lab/">Go to Lab</a>

<ProgressBadge week="03" client:load />

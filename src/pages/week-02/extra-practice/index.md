---
layout: ../../../layouts/CourseLayout.astro
title: "Week 02 - Extra Practice"
description: "Optional practice for Week 2"
setup: |
  import ViewedMarker from "../../../components/progress/ViewedMarker";
  import ProgressBadge from "../../../components/progress/ProgressBadge";
  import { editorUrl } from "../../../lib/editorLinks";
---

<ViewedMarker week="02" slug="extra-practice" client:load />

# Extra practice: Clean output

## Goal
- Practice labeling values clearly
- Use interpolation and formatting
- Keep money values tidy

## What to know
- Consistent labels help readers understand output quickly.
- Format specifiers keep decimals aligned.

## Examples
```csharp
string item = "Notebook";
double price = 2.49;
int qty = 3;
double total = price * qty;

Console.WriteLine($"Item: {item}");
Console.WriteLine($"Qty: {qty}");
Console.WriteLine($"Price: ${price:F2}");
Console.WriteLine($"Total: ${total:F2}");
```

## Try it
- Add a "Tax" line at 7% and a new total line.
- Change qty to 5 and confirm totals update.
- Align labels by adding spaces if needed.

## Common mistakes
- Forgetting the `$` in front of strings with `{}`.
- Using commas instead of dots for decimals.
- Typos in variable names causing 0 or default values.

## Mini-check
- How do you show money to two decimals?
<details>
<summary>Show answer</summary>
Use `$"${value:F2}"` or include a label like `$"Total: ${total:F2}"`.
</details>

## Next
- <a class="button" href={editorUrl("02", "extra-practice")}>
    Open in Editor (Week 2 Extra Practice)
  </a>
- <a class="button-ghost" href="../lab/">Go to Lab</a>

<ProgressBadge week="02" client:load />

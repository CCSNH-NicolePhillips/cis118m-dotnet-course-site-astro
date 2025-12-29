---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Extra Practice"
description: "Week 1 Extra Practice: Mini drills to reinforce variables and output"
---

import TryMeNow from '../../../components/TryMeNow.astro';

# Week 1 Extra Practice: Mini Drills

**Time: 20 minutes**

These are quick drills to reinforce what you learned in Lessons 1 and 2. Complete as many as you can — they're all in the same editor.

## Instructions

Work through these prompts one at a time in the editor. After completing each one, test it to make sure it works!

<TryMeNow
  starterId="week-01-extra-practice"
  tasks={[
    "Complete the 10 practice drills below",
    "Test each one as you go",
    "All drills are in the same starter"
  ]}
  tip="Don't rush! The goal is to build muscle memory by typing the code yourself."
/>

## Drill 1: Print Your Name 3 Times

Print your name (or a nickname) three times, each on a separate line.

**Expected output:**
```
Alice
Alice
Alice
```

---

## Drill 2: Print a Simple Border

Print a line of equals signs (`=`) to make a border:

**Expected output:**
```
====================
```

**Tip:** You can put it all in one `Console.WriteLine`

---

## Drill 3: Create and Print a String Variable

Create a string variable called `favoriteColor` and print it with a label.

**Expected output:**
```
My favorite color is blue
```

---

## Drill 4: Create and Print an Int Variable

Create an int variable called `luckyNumber` (use any number) and print it with a label.

**Expected output:**
```
My lucky number is 7
```

---

## Drill 5: Do Simple Math

Create a variable `score` set to 85. Print the score plus 10.

**Expected output:**
```
Score + 10 = 95
```

**Tip:** Use `{score + 10}` inside string interpolation

---

## Drill 6: Print Multiple Variables

Create two variables: `firstName` and `lastName`. Print them together as a full name.

**Expected output:**
```
Full Name: Alice Johnson
```

---

## Drill 7: Print a Blank Line

Print three lines with a blank line in the middle:

**Expected output:**
```
Line 1

Line 3
```

**Tip:** Use `Console.WriteLine();` with nothing inside for the blank line

---

## Drill 8: Fix the Bug

This code has an error. Find and fix it:

```csharp
string name = Alice;
Console.WriteLine(name);
```

**What's wrong?** (Hint: strings need quotes)

---

## Drill 9: Change Concatenation to Interpolation

Rewrite this using string interpolation (`$""`):

```csharp
string city = "Boston";
Console.WriteLine("I live in " + city);
```

**Answer:**
```csharp
string city = "Boston";
Console.WriteLine($"I live in {city}");
```

---

## Drill 10: Create a Mini Profile Card

Print a formatted profile using 4+ variables:

**Expected output:**
```
=== My Profile ===
Name: Alice Johnson
Age: 20
City: Boston
Hobby: Reading
```

**Requirements:**
- Use at least 4 variables
- Use string interpolation
- Include the header line with ===

---

## Challenge (Optional)

If you finish all 10 drills, try this:

**Create a simple menu:**

```
=== Main Menu ===
1) Start Game
2) View High Scores
3) Settings
4) Quit
```

**Requirement:** Use variables for the menu items (not just hard-coded text)

---

## What's Next?

Great practice! You're building the foundation for more complex programs. Now it's time to test your understanding:

- [Checkpoint Quiz](../checkpoint-quiz/) — Auto-graded quiz (20 min)
- [Back to Week 1 Overview](../)

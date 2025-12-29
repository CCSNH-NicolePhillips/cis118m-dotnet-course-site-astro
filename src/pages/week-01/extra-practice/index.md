---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Extra Practice"
description: "Week 1 Extra Practice: Micro coding drills"
---

import TryItNowRunner from '../../../components/TryItNowRunner.astro';

# Week 1 Extra Practice

**Time: 25 minutes**

These are quick micro-drills to reinforce what you learned in Lessons 1 and 2. Each one should take 2-4 minutes.

---

## Drill 1: Change the Text

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, world!");
    }
}`}
  starterId="week-01-extra-01"
  height={180}
  instructions="Change the message to print your favorite quote or song lyric."
/>

---

## Drill 2: Add a Third Line

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Line 1");
        Console.WriteLine("Line 2");
    }
}`}
  starterId="week-01-extra-02"
  height={200}
  instructions="Add a third Console.WriteLine to print 'Line 3'."
/>

---

## Drill 3: Fix the Missing Quotes

This code has an error. Fix it!

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine(Hello);
    }
}`}
  starterId="week-01-extra-03"
  height={180}
  instructions="Add quotes around Hello so the code runs without errors."
/>

**Hint:** Text must always be in quotes!

---

## Drill 4: Fix the Missing Semicolon

This code has an error. Fix it!

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello")
        Console.WriteLine("World")
    }
}`}
  starterId="week-01-extra-04"
  height={200}
  instructions="Add semicolons at the end of each Console.WriteLine statement."
/>

**Hint:** Every statement needs a semicolon at the end!

---

## Drill 5: Add a Comment

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("This code needs a comment!");
    }
}`}
  starterId="week-01-extra-05"
  height={200}
  instructions="Add a comment above the Console.WriteLine explaining what it does."
/>

**Example comment:** `// Print a greeting to the user`

---

## Drill 6: Use a Variable

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        string name = "Nikki";
        Console.WriteLine(name);
    }
}`}
  starterId="week-01-extra-06"
  height={200}
  instructions="Change the name variable to your own name, then run."
/>

---

## Drill 7: String Interpolation Practice

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        string food = "pizza";
        Console.WriteLine($"My favorite food is {food}.");
    }
}`}
  starterId="week-01-extra-07"
  height={200}
  instructions="Change 'food' to your favorite food, then add a second variable for your favorite color and print it."
/>

---

## Drill 8: Newline Practice

<TryItNowRunner
  code={`using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("First\nSecond");
    }
}`}
  starterId="week-01-extra-08"
  height={180}
  instructions="Add a third line using \n in the same Console.WriteLine statement."
/>

**Challenge:** Try using `\t` (tab) instead of `\n` and see what happens!

---

## Great Job!

You've completed all the extra practice drills. If you're comfortable with these concepts, move on to the Checkpoint Quiz.

If you want more practice:
- Go back through Lessons 1 and 2
- Try the "Your Turn" challenges
- Experiment with the inline runners

**Next Steps:**

- [Checkpoint Quiz →](../checkpoint-quiz/)
- [Lab 1: Welcome Program →](../lab-1/)
- [Back to Week 1 Overview](../)

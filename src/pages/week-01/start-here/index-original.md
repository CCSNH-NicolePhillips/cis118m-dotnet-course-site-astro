---
layout: ../../../layouts/CourseLayout.astro
title: "Start Here + Site Tour"
description: "Learn how to use the course site and get started"
---
import TryMeNow from '../../../components/TryMeNow.astro';

# Start Here + Site Tour

**Time: 30 minutes**

Welcome to CIS 118M! This page will show you how everything works so you can succeed in this course.

## How This Course Works

This is a **fully online, self-paced course**. Everything happens right here on this site — no external tools required (except Canvas for grades).

### What You'll Do Each Week

1. **Read lessons** — Short, focused explanations with examples
2. **Try code in the browser** — Write and run C# code without installing anything
3. **Complete practice exercises** — Reinforce what you learned
4. **Take quizzes** — Auto-graded, instant feedback
5. **Submit labs** — Graded assignments that test your skills

### How You're Graded

Your grade comes from these categories:

- **Quizzes (30%)** — Weekly checkpoint quizzes (auto-graded, can retake)
- **Labs (50%)** — Hands-on coding assignments (graded for correctness + requirements)
- **Final Project (20%)** — Capstone project at the end of the semester

**Passing grade:** 70% or higher

## Finding Your Way Around

### Weekly Modules

Each week has its own module in the left sidebar. Click a week to see:

- **Overview** — Checklist of what to do (with time estimates)
- **Lessons** — Core content to read and try
- **Extra Practice** — Optional drills (highly recommended!)
- **Checkpoint Quiz** — Test your understanding
- **Lab** — Graded assignment

### Progress Tracking

You'll see checkmarks and dots next to items in the sidebar:

- **✓** = Completed
- **•** = In progress (you've started but not finished)
- **Nothing** = Not started yet

Progress is saved automatically when you're logged in.

## Using the Code Editor (IDE)

The **IDE** (Integrated Development Environment) is where you write and run C# code. It runs entirely in your browser — no installation needed!

### Editor Features

- **Run** — Compile and execute your code
- **Save** — Save your work to the cloud (requires login)
- **Reset** — Restore the original starter code
- **Download** — Download your code as a .cs file
- **Checks** — Run automated tests (for labs)

### Try It Now!

Let's practice using the editor. Complete these three micro-actions:

<TryMeNow
  starterId="week-01-lesson-1"
  tasks={[
    "Click the 'Run' button to see the output",
    "Look at the console output at the bottom of the screen"
  ]}
  expectedOutput="Hello, .NET!\nIf you can read this, your program ran."
  tip="The output appears in the panel at the bottom. If you don't see it, click 'Console' tab."
/>

**Action 2: Change the code and rerun**

<TryMeNow
  starterId="week-01-lesson-1"
  tasks={[
    "Change one of the messages inside the quotes",
    "Click 'Run' again to see your change"
  ]}
  tip="Only change the text inside the quotes, not the whole line!"
/>

**Action 3: Break the code (then fix it!)**

<TryMeNow
  starterId="week-01-lesson-1"
  tasks={[
    "Remove a semicolon (;) from the end of a line",
    "Click 'Run' and read the error message",
    "Put the semicolon back and run again — it should work now"
  ]}
  tip="Error messages tell you what's wrong and which line has the problem. Read the first line of the error first!"
/>

## How to Get Help

You **will** get stuck. That's normal and part of learning! Here's how to get help:

### What to Include When Asking for Help

Always provide:

1. **Screenshot** — Show the error or problem
2. **Starter ID** — Tell us which exercise (e.g., "week-01-lesson-1")
3. **What you tried** — Explain what you did and what happened
4. **The error message** — Copy/paste the exact error text

**Good example:**

> "I'm working on week-01-lesson-2 and getting this error: 'CS1002: ; expected'. I tried adding a semicolon at the end but it still doesn't work. Screenshot attached."

**Bad example:**

> "My code doesn't work. Help!"

### Where to Ask

- **Canvas Discussion Board** — Best for course questions
- **Email instructor** — For personal/grade questions
- **Office hours** — Check syllabus for times

## Tips for Success

✅ **Do the work in order** — Each lesson builds on the last

✅ **Type the code yourself** — Don't copy/paste. Typing helps you learn.

✅ **Read error messages carefully** — They tell you exactly what's wrong

✅ **Use Extra Practice** — More practice = better understanding

✅ **Ask questions early** — Don't wait until you're completely lost

✅ **Save your work often** — Click "Save" in the editor (requires login)

## Ready to Start?

Great! Head to the [Syllabus](../syllabus/) to learn about course policies, then complete the [Syllabus Acknowledgement](../syllabus-ack/) quiz.

## Quick Links

- [Week 1 Overview](../) — Your checklist for this week
- [Syllabus](../syllabus/) — Course policies and grading
- [Lesson 1](../lesson-1/) — Start learning C#!

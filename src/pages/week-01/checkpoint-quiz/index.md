---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Checkpoint Quiz"
description: "Week 1 Checkpoint Quiz: Test your understanding"
---

import Quiz from '../../../components/Quiz.astro';

# Week 1 Checkpoint Quiz

**Time: 20 minutes**

Test your understanding of C#, .NET, variables, and output. This quiz is **auto-graded** and you can retake it if needed.

**Passing score:** 70% (7 out of 10 correct)

<Quiz
  quizId="week-01-checkpoint"
  title="Week 1: C# Basics"
  passingScore={70}
  questions={[
    {
      id: "q1",
      type: "multiple-choice",
      question: "What is C#?",
      options: [
        "A programming language",
        "A platform that runs code",
        "An operating system",
        "A type of computer"
      ],
      correctAnswer: "A programming language",
      explanation: "C# is the programming language you write. .NET is the platform that runs it."
    },
    {
      id: "q2",
      type: "multiple-choice",
      question: "What does Console.WriteLine do?",
      options: [
        "Prints a line of text to the console",
        "Gets input from the user",
        "Creates a new variable",
        "Ends the program"
      ],
      correctAnswer: "Prints a line of text to the console"
    },
    {
      id: "q3",
      type: "true-false",
      question: "Every C# statement must end with a semicolon (;)",
      correctAnswer: "True",
      explanation: "Yes, statements in C# end with semicolons."
    },
    {
      id: "q4",
      type: "multiple-choice",
      question: "Which is the correct way to create a string variable?",
      options: [
        "string name = \"Alice\";",
        "string name = Alice;",
        "name = \"Alice\";",
        "String name = \"Alice\";"
      ],
      correctAnswer: "string name = \"Alice\";",
      explanation: "String variables need quotes around the text. The type (string) comes first, then the name, then = and the value."
    },
    {
      id: "q5",
      type: "multiple-choice",
      question: "What will this code print? int age = 20; Console.WriteLine(age + 5);",
      options: [
        "25",
        "20 + 5",
        "age + 5",
        "205"
      ],
      correctAnswer: "25",
      explanation: "The code does the math (20 + 5 = 25) and prints the result."
    },
    {
      id: "q6",
      type: "multiple-choice",
      question: "What's wrong with this code? string city = Boston;",
      options: [
        "Missing quotes around Boston",
        "Missing semicolon",
        "Wrong variable name",
        "Nothing is wrong"
      ],
      correctAnswer: "Missing quotes around Boston",
      explanation: "String values must be in quotes: string city = \"Boston\";"
    },
    {
      id: "q7",
      type: "multiple-choice",
      question: "Which is an example of string interpolation?",
      options: [
        "Console.WriteLine($\"Hello, {name}\");",
        "Console.WriteLine(\"Hello, \" + name);",
        "Console.WriteLine(Hello, name);",
        "Console.WriteLine(\"Hello, name\");"
      ],
      correctAnswer: "Console.WriteLine($\"Hello, {name}\");",
      explanation: "String interpolation uses $ before the quote and {} around variables."
    },
    {
      id: "q8",
      type: "true-false",
      question: "You can do math with string variables.",
      correctAnswer: "False",
      explanation: "False. Math works with numbers (int, double, etc.), not strings. With strings, + concatenates (glues together) instead of adding."
    },
    {
      id: "q9",
      type: "multiple-choice",
      question: "What will this print? string x = \"5\"; string y = \"10\"; Console.WriteLine(x + y);",
      options: [
        "510",
        "15",
        "5 + 10",
        "Error"
      ],
      correctAnswer: "510",
      explanation: "When you use + with strings, it concatenates (glues) them together: \"5\" + \"10\" = \"510\""
    },
    {
      id: "q10",
      type: "multiple-choice",
      question: "Which of these is a good variable name?",
      options: [
        "firstName",
        "first name",
        "1stName",
        "class"
      ],
      correctAnswer: "firstName",
      explanation: "firstName uses camelCase and is descriptive. The others have errors: spaces aren't allowed, can't start with a number, and class is a reserved keyword."
    }
  ]}
/>

## What's Next?

**If you passed (70% or higher):**

Great job! You're ready to move on to the lab:

- [Lab 1: About Me Console App](../lab-1/) — Build and submit your first graded lab

**If you didn't pass:**

No worries! Review these materials and try again:

- [Lesson 1](../lesson-1/) — Review .NET vs C# and Hello World
- [Lesson 2](../lesson-2/) — Review variables, strings, and output
- [Extra Practice](../extra-practice/) — Do more drills to build confidence

Then **retake this quiz** — you can take it as many times as you need!

---

[Back to Week 1 Overview](../)

---
layout: ../../../layouts/CourseLayout.astro
title: "Syllabus Acknowledgement"
description: "Confirm you've read and understood the syllabus"
---
import Quiz from '../../../components/Quiz.astro';

# Syllabus Acknowledgement Quiz

**Time: 10 minutes** (after reading the [Syllabus](../syllabus/))

Complete this quiz to confirm you've read and understood the course syllabus. This is a **completion-based quiz** — there are no wrong answers, but you must select an answer for each question.

**Passing score:** 100% (all questions answered)

<Quiz
  quizId="week-01-syllabus-ack"
  title="I have read the syllabus and understand:"
  passingScore={100}
  questions={[
    {
      id: "q1",
      type: "checkbox",
      question: "Where to find weekly course materials",
      options: ["I know where weekly modules are in the sidebar"],
      correctAnswer: ["I know where weekly modules are in the sidebar"]
    },
    {
      id: "q2",
      type: "checkbox",
      question: "How my grade is calculated",
      options: ["I know that grades come from quizzes (30%), labs (50%), and final project (20%)"],
      correctAnswer: ["I know that grades come from quizzes (30%), labs (50%), and final project (20%)"]
    },
    {
      id: "q3",
      type: "checkbox",
      question: "What the passing grade is",
      options: ["I know that I need 70% or higher to pass"],
      correctAnswer: ["I know that I need 70% or higher to pass"]
    },
    {
      id: "q4",
      type: "checkbox",
      question: "How labs are graded",
      options: ["I know labs are graded on correctness, requirements, readability, and submission"],
      correctAnswer: ["I know labs are graded on correctness, requirements, readability, and submission"]
    },
    {
      id: "q5",
      type: "checkbox",
      question: "The late work policy",
      options: ["I know that late labs lose 10% per day (up to 3 days)"],
      correctAnswer: ["I know that late labs lose 10% per day (up to 3 days)"]
    },
    {
      id: "q6",
      type: "checkbox",
      question: "Academic integrity policy",
      options: ["I know I must write my own code and cannot use AI tools or copy from others"],
      correctAnswer: ["I know I must write my own code and cannot use AI tools or copy from others"]
    },
    {
      id: "q7",
      type: "checkbox",
      question: "How to get help",
      options: ["I know to post in Canvas discussion board, attend office hours, or email instructor"],
      correctAnswer: ["I know to post in Canvas discussion board, attend office hours, or email instructor"]
    },
    {
      id: "q8",
      type: "checkbox",
      question: "What to include when asking for help",
      options: ["I know to include screenshots, starter ID, what I tried, and error messages"],
      correctAnswer: ["I know to include screenshots, starter ID, what I tried, and error messages"]
    }
  ]}
/>

## What's Next?

Great! You've completed the syllabus acknowledgement. Now you're ready to start learning C#:

- [Lesson 1: What is .NET vs C#?](../lesson-1/)
- [Week 1 Overview](../) — See your full checklist

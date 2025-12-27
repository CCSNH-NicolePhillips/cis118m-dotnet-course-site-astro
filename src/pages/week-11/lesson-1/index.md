---
layout: ../../../layouts/CourseLayout.astro
title: "Week 11 • Lesson 1"
description: "Week 11 Lesson 1: List of objects (rosters, inventories, etc.)"
---

# Week 11 Lesson 1: List of objects (rosters, inventories, etc.)

## Goal
- Create objects and add them to a List
- Use foreach to print objects
- Write a method on the class that returns a summary string

## What to know
- **List<T>**: A flexible collection you can add/remove items from.
- **List of objects**: Example: `List<Student>` stores many Student objects.
- **Summary method**: Returns a string that describes the object (great for output and testing).

## Examples
```csharp
using System.Collections.Generic;

class Student
{
    public string Id { get; set; }
    public string Name { get; set; }

    public Student(string id, string name)
    {
        Id = id;
        Name = name;
    }

    public string Summary()
    {
        return $"{Id} - {Name}";
    }
}

List<Student> roster = new List<Student>();
roster.Add(new Student("S001", "Ava"));
roster.Add(new Student("S002", "Ben"));

foreach (Student s in roster)
{
    Console.WriteLine(s.Summary());
}
```

## Try it
- Create 3 objects and add them to a list.
- Print the list using foreach (call a `Summary()` method).
- Add one more item and print the new count.

## Common mistakes
- Forgetting to create objects before adding them.
- Printing messy output (use Summary methods).
- Mixing strings and objects (a list of Students is not a list of strings).

## Mini-check
**1) What does `List<Student>` mean?**

<details>
<summary>Show answer</summary>

A list that stores Student objects.

</details>

## Next
- Go to Lesson 2: [Searching a list (find by ID)](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=11&starter=week-11-lesson-1)

<a href="/editor/?week=11&starter=week-11-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



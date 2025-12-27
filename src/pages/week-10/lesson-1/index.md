---
layout: ../../../layouts/CourseLayout.astro
title: "Week 10 • Lesson 1"
description: "Week 10 Lesson 1: Classes = blueprints, objects = actual things"
---

# Week 10 Lesson 1: Classes = blueprints, objects = actual things

## Goal
- Create a class with a few properties
- Create objects from that class
- Read and update property values

## What to know
- **Class**: A blueprint that describes what something *has* and *can do*.
- **Object**: A real instance created from a class.
- **Property**: A named value on an object (like `Name` or `Age`).
- **new**: Creates a new object.

## Examples
```csharp
class Person
{
    public string Name { get; set; }
    public int Age { get; set; }
}

Person p = new Person();
p.Name = "Ava";
p.Age = 19;

Console.WriteLine($"{p.Name} is {p.Age}.");
```

```csharp
class Rectangle
{
    public int Width { get; set; }
    public int Height { get; set; }

    public int Area()
    {
        return Width * Height;
    }
}

Rectangle r = new Rectangle();
r.Width = 3;
r.Height = 4;
Console.WriteLine(r.Area());
```

## Try it
- Create a `Person` class with `Name` and `Age`. Create 2 people and print them.
- Create a `Rectangle` class with `Width` and `Height` and a method `Area()`.
- Change a property after creating an object and print the new value.

## Common mistakes
- Forgetting `new` (you must create the object before using it).
- Using variables that aren’t objects (a class name is not an object).
- Mixing up what belongs in the class vs the main program (the blueprint vs the using).

## Mini-check
**1) What’s the difference between a class and an object?**

<details>
<summary>Show answer</summary>

Class = blueprint. Object = a real instance made from the blueprint.

</details>

**2) Where do you store data like Name and Age?**

<details>
<summary>Show answer</summary>

In properties on the class.

</details>

## Next
- Go to Lesson 2: [Constructors + clean object setup](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=10&starter=week-10-lesson-1)

<a href="/editor/?week=10&starter=week-10-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



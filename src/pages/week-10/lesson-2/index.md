---
layout: ../../../layouts/CourseLayout.astro
title: "Week 10 • Lesson 2"
description: "Week 10 Lesson 2: Constructors (set up objects the easy way)"
---

# Week 10 Lesson 2: Constructors (set up objects the easy way)

## Goal
- Understand what a constructor does
- Create a constructor with parameters
- Use constructors to make cleaner code

## What to know
- **Constructor**: A special method that runs when you create an object.
- **Default constructor**: A constructor with no parameters.
- **Parameterized constructor**: A constructor that accepts values to set up the object.
- **this**: Refers to the current object (the one being created).

## Examples
```csharp
class Person
{
    public string Name { get; set; }
    public int Age { get; set; }

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
    }
}

Person p = new Person("Ava", 19);
Console.WriteLine($"{p.Name} is {p.Age}.");
```

```csharp
class BankAccount
{
    public string Owner { get; set; }
    public double Balance { get; set; }

    public BankAccount(string owner)
    {
        Owner = owner;
        Balance = 0;
    }
}

BankAccount a = new BankAccount("Ben");
Console.WriteLine($"{a.Owner}: {a.Balance}");
```

## Try it
- Add a constructor to `Rectangle` that sets width and height.
- Create 3 objects using your constructor and print them.
- Add a method `Describe()` that returns a string summary (easy to test later).

## Common mistakes
- Forgetting the constructor name must match the class name exactly.
- Setting up objects with lots of lines when a constructor would be cleaner.
- Printing inside the class everywhere (prefer returning strings from methods).

## Mini-check
**1) When does a constructor run?**

<details>
<summary>Show answer</summary>

Automatically when you create an object with `new`.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=10&starter=week-10-lesson-2)

<a href="/editor/?week=10&starter=week-10-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



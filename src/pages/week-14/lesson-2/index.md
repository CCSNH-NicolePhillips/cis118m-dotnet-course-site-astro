---
layout: ../../../layouts/CourseLayout.astro
title: "Week 14 • Lesson 2"
description: "Week 14 Lesson 2: Clean class design (methods that return success)"
---

# Week 14 Lesson 2: Clean class design (methods that return success)

## Goal
- Write methods that return `bool` for success/failure
- Keep the main program simple (call methods, print results)
- Make code test-friendly by returning values

## What to know
- **bool return**: True/false result so code can decide what to do next.
- **Contract**: A method’s promise: inputs and what it returns.

## Examples
```csharp
class BankAccount
{
    public string Owner { get; }
    public double Balance { get; private set; }

    public BankAccount(string owner, double starting)
    {
        Owner = owner;
        Balance = starting < 0 ? 0 : starting;
    }

    public void Deposit(double amount)
    {
        if (amount > 0) Balance += amount;
    }

    public bool Withdraw(double amount)
    {
        if (amount <= 0) return false;
        if (amount > Balance) return false;
        Balance -= amount;
        return true;
    }
}
```

## Try it
- Use a bool-return Withdraw method and print ‘Success’ or ‘Rejected’.
- Write a method `CanAfford(double cost)` that returns true/false.
- Create 4 test cases (two should fail).

## Common mistakes
- Printing inside the method instead of returning a result.
- Not using the returned bool (then the result is wasted).
- Forgetting to update state (like Balance) on success.

## Mini-check
**1) Why return bool from a method like Withdraw?**

<details>
<summary>Show answer</summary>

So the caller can react (print a message, retry, etc.) without the class doing UI work.

</details>

## Next
- Optional extra practice: [Extra practice](../extra-practice/)
- Open the editor: [Open the code editor](/editor/?week=14&starter=week-14-lesson-2)

<a href="/editor/?week=14&starter=week-14-lesson-2" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



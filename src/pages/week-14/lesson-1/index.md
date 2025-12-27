---
layout: ../../../layouts/CourseLayout.astro
title: "Week 14 • Lesson 1"
description: "Week 14 Lesson 1: Encapsulation (protect your data)"
---

# Week 14 Lesson 1: Encapsulation (protect your data)

## Goal
- Understand why we ‘protect’ fields
- Use private fields with public properties
- Add validation rules (no negative balances, etc.)

## What to know
- **Encapsulation**: Keeping data safe by controlling how it changes.
- **private**: Only usable inside the class.
- **public**: Usable from outside the class.
- **Field**: A variable stored inside an object.

## Examples
```csharp
class BankAccount
{
    private double _balance;

    public double Balance
    {
        get { return _balance; }
        private set { _balance = value; } // only the class can change it
    }

    public BankAccount(double startingBalance)
    {
        if (startingBalance < 0) startingBalance = 0;
        Balance = startingBalance;
    }

    public void Deposit(double amount)
    {
        if (amount <= 0) return;
        Balance = Balance + amount;
    }
}
```

## Try it
- Add a `Withdraw` method that blocks invalid withdrawals.
- Try to set Balance from main and notice you can’t if setter is private.
- Create 2 accounts and test deposits/withdrawals.

## Common mistakes
- Making everything public (then anything can break your rules).
- Allowing negative values through your methods.
- Putting all validation in main instead of inside the class (hard to reuse).

## Mini-check
**1) What does encapsulation help you prevent?**

<details>
<summary>Show answer</summary>

Invalid data changes (like negative balance) and messy code spread everywhere.

</details>

## Next
- Go to Lesson 2: [Designing class methods for clean apps](../lesson-2/)
- Open the editor: [Open the code editor](/editor/?week=14&starter=week-14-lesson-1)

<a href="/editor/?week=14&starter=week-14-lesson-1" class="button" style="display:inline-block;margin-top:8px;">Open Code Editor</a>



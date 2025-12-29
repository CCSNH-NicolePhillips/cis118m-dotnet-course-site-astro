---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Lab 1"
description: "Week 1 Lab 1: About Me Console App"
---

# Week 1 Lab 1: About Me Console App

**Time: 40 minutes**  
**Points: 100**  
**Due: See Canvas**

## Overview

Create a console application that prints information about you in a formatted, readable way. This lab tests your ability to:

- Use variables (strings and int)
- Print formatted output with labels
- Use string concatenation OR interpolation
- Write code that compiles and runs without errors

## Requirements

Your program **MUST** include all of the following:

### 1. Header Line (10 points)

Print a header that looks like this:

```
=== About Me ===
```

### 2. Variables (30 points)

Create **at least 3 variables**. Suggested variables:

- `name` (string)
- `city` (string)  
- `age` (int)
- `favoriteHobby` (string)
- `favoriteFood` (string)

You can add more if you want!

### 3. Labeled Output (30 points)

Print **at least 6 labeled lines**. Each line should have a label and a value.

**Example:**
```
Name: Alice Johnson
City: Boston
Age: 20
Hobby: Reading
Favorite Food: Pizza
Fun Fact: I love learning to code!
```

### 4. String Concatenation OR Interpolation (20 points)

Use **either** string concatenation (`+`) **OR** string interpolation (`$""` and `{}`) at least once.

**Concatenation example:**
```csharp
Console.WriteLine("Name: " + name);
```

**Interpolation example (recommended):**
```csharp
Console.WriteLine($"Name: {name}");
```

### 5. No Compile Errors (10 points)

Your code must **compile and run** without errors. Test it with the **Run** button before submitting!

## Grading Rubric

| Category | Points | Criteria |
|----------|--------|----------|
| **Correctness** | 60 | Runs without errors, produces output |
| **Requirements** | 20 | Has header, 3+ variables, 6+ labeled lines, uses concatenation/interpolation |
| **Readability** | 10 | Well-formatted, good variable names, logical spacing |
| **Submission** | 10 | Submitted on time via the Submit Lab button |

**Total:** 100 points

## Getting Started

1. Click the button below to open the editor
2. Start with the provided template
3. Add your variables and output
4. Test with **Run** to make sure it works
5. When ready, click **Submit Lab** below

<a href="/editor/?week=01&starter=week-01-lesson-2" class="button" style="display:inline-block;margin:20px 0;padding:12px 24px;background:var(--accent);color:white;text-decoration:none;border-radius:6px;font-weight:600;">Open Lab in Editor</a>

## Example Output

Your output should look something like this (but with YOUR information):

```
=== About Me ===
Name: Alice Johnson
City: Boston
State: Massachusetts
Age: 20
Hobby: Reading
Favorite Food: Pizza
Fun Fact: I love learning to code!
```

## Tips

✅ **Start simple** — Get the basic structure working first, then add details

✅ **Test often** — Click Run after each change to catch errors early

✅ **Use good variable names** — `firstName` is better than `x`

✅ **Format your output** — Add blank lines with `Console.WriteLine();` to make it readable

✅ **Check the requirements** — Make sure you have everything before submitting

## Common Mistakes to Avoid

❌ Missing quotes around strings

❌ Forgetting semicolons

❌ Not using variables (hard-coding everything)

❌ Submitting without testing

## Submission

### How to Submit

1. Make sure your code runs without errors (click **Run**)
2. Click the **Submit Lab** button below
3. You'll see a confirmation message
4. Your code is automatically saved to your account

<div id="lab-submit-container" style="margin: 30px 0;">
  <button id="submit-lab-btn" class="submit-button" style="background:var(--accent);color:white;padding:12px 24px;border:none;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;">
    Submit Lab 1
  </button>
  <div id="submit-status" style="margin-top:12px;"></div>
</div>

<script>
  (async () => {
    const submitBtn = document.getElementById('submit-lab-btn');
    const statusDiv = document.getElementById('submit-status');
    
    // Wait for auth
    const waitForAuth = async () => {
      let attempts = 0;
      while (!window.__auth) {
        if (attempts++ > 100) return false;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return true;
    };
    
    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      statusDiv.innerHTML = '';
      
      try {
        // Check auth
        const authAvailable = await waitForAuth();
        if (!authAvailable) {
          throw new Error('Please sign in to submit labs');
        }
        
        const authed = await window.__auth.isAuthed();
        if (!authed) {
          throw new Error('Please sign in to submit labs');
        }
        
        // Get current code from editor (if they have it open)
        // For now, we'll just record the submission
        const token = await window.__auth.getAccessToken();
        
        const response = await fetch('/api/completion-update', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'lab',
            id: 'week-01-lab-1',
            passed: true  // We'll add checks later
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        statusDiv.innerHTML = `
          <div style="background:#10b981;color:white;padding:16px;border-radius:6px;">
            <strong>✓ Lab Submitted Successfully!</strong>
            <p style="margin:8px 0 0 0;">Submitted at: ${new Date().toLocaleString()}</p>
            <p style="margin:8px 0 0 0;">Your work has been saved. The instructor will review and grade it.</p>
          </div>
        `;
        
        submitBtn.textContent = 'Submitted ✓';
        submitBtn.style.background = '#10b981';
        
      } catch (err) {
        console.error('[Lab Submit] Error:', err);
        statusDiv.innerHTML = `
          <div style="background:#ef4444;color:white;padding:16px;border-radius:6px;">
            <strong>✗ Submission Failed</strong>
            <p style="margin:8px 0 0 0;">${err.message}</p>
            <p style="margin:8px 0 0 0;">Make sure you're signed in and try again.</p>
          </div>
        `;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Lab 1';
      }
    });
  })();
</script>

<style>
  .button {
    display: inline-block;
    background: var(--accent);
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    transition: background 0.2s;
  }
  
  .button:hover {
    background: var(--accent-hover);
    text-decoration: none;
  }
  
  .submit-button:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  
  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

## After Submitting

- Your submission is recorded with a timestamp
- The instructor will review and grade your work
- You can resubmit if needed (only the latest submission counts)
- Check Canvas for your grade

## Need Help?

**Stuck on something?** Review these resources:

- [Lesson 1: Hello World](../lesson-1/)
- [Lesson 2: Variables and Output](../lesson-2/)
- [Extra Practice](../extra-practice/)

**Still need help?** Post in the Canvas discussion board with:
- Screenshot of your code
- Screenshot of any error messages
- What you've tried so far

---

**Good luck! You've got this! 🚀**

[Back to Week 1 Overview](../)

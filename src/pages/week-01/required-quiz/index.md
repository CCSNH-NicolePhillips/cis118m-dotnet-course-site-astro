---
layout: ../../../layouts/CourseLayout.astro
title: "Week 01 • Required Quiz"
description: "Week 1 Required Submission Quiz"
---

# Required Submission Quiz

**Time: 5 minutes**  
**Points: 10 (completion only)**

This is a **completion quiz**. There are no wrong answers. Just answer honestly so I know you completed Week 1.

---

## Questions

<div style="max-width: 700px; margin: 0 auto;">

<div style="margin: 2rem 0; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px;">
  <h4 style="margin-top: 0;">Question 1</h4>
  <p><strong>On a scale of 1-5, how comfortable are you with the Week 1 material?</strong></p>
  <p style="font-size: 14px; color: #666;">(1 = Very confused, 5 = Very comfortable)</p>
  
  <div style="margin: 1rem 0;">
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q1" value="1" required>
      1 - Very confused
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q1" value="2">
      2 - Somewhat confused
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q1" value="3">
      3 - Neutral
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q1" value="4">
      4 - Somewhat comfortable
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q1" value="5">
      5 - Very comfortable
    </label>
  </div>
</div>

<div style="margin: 2rem 0; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px;">
  <h4 style="margin-top: 0;">Question 2</h4>
  <p><strong>How many hours did you spend on Week 1 content (total)?</strong></p>
  
  <div style="margin: 1rem 0;">
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q2" value="0-2" required>
      0-2 hours
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q2" value="2-3.5">
      2-3.5 hours (target time)
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q2" value="3.5-5">
      3.5-5 hours
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="radio" name="q2" value="5+">
      More than 5 hours
    </label>
  </div>
</div>

<div style="margin: 2rem 0; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px;">
  <h4 style="margin-top: 0;">Question 3</h4>
  <p><strong>Did you complete all Week 1 activities?</strong></p>
  
  <div style="margin: 1rem 0;">
    <label style="display: block; margin: 0.5rem 0;">
      <input type="checkbox" name="q3-lessons" value="true">
      Lessons 1 & 2
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="checkbox" name="q3-extra" value="true">
      Extra Practice
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="checkbox" name="q3-checkpoint" value="true">
      Checkpoint Quiz
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="checkbox" name="q3-lab" value="true">
      Lab 1
    </label>
    <label style="display: block; margin: 0.5rem 0;">
      <input type="checkbox" name="q3-homework" value="true">
      Homework
    </label>
  </div>
</div>

<div style="margin: 2rem 0; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px;">
  <h4 style="margin-top: 0;">Question 4 (Optional)</h4>
  <p><strong>Any feedback or suggestions for Week 1?</strong></p>
  
  <textarea id="q4-feedback" rows="4" style="
    width: 100%;
    padding: 12px;
    font-size: 14px;
    border: 2px solid #ccc;
    border-radius: 6px;
    font-family: inherit;
  " placeholder="Optional: What worked well? What could be improved?"></textarea>
</div>

</div>

---

## Submit Quiz

<div id="submit-section" style="margin-top: 2rem; padding: 1.5rem; border: 2px solid #9C27B0; border-radius: 8px; background: rgba(156, 39, 176, 0.05); max-width: 700px; margin-left: auto; margin-right: auto;">
  <h3 style="margin-top: 0;">Ready to Submit?</h3>
  <p>This quiz is for completion only. Answer honestly!</p>
  
  <button id="submit-quiz-btn" style="
    padding: 12px 24px;
    font-size: 16px;
    font-weight: bold;
    background: #9C27B0;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    margin-right: 10px;
  ">
    Submit Quiz
  </button>
  
  <div id="submit-status" style="margin-top: 1rem; font-weight: bold;"></div>
  <div id="last-submitted" style="margin-top: 0.5rem; color: #666; font-size: 14px;"></div>
</div>

<script src="/scripts/submit-quiz.js"></script>

---

## Congratulations! 🎉

You've completed Week 1! Great work.

**Next Steps:**

- [Back to Week 1 Overview](../)
- Check Canvas for your grades
- Start Week 2 when it's released


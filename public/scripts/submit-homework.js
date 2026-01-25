// Homework submission script
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-homework-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  const reflectionInput = document.getElementById("reflection-input");
  
  // Due dates per week (matches server-side due-dates.mjs)
  const WEEK_DUE_DATES = {
    1: '2026-01-25T23:59:59-05:00',
    2: '2026-02-01T23:59:59-05:00',
    3: '2026-02-08T23:59:59-05:00',
    4: '2026-02-15T23:59:59-05:00',
    5: '2026-02-22T23:59:59-05:00',
    6: '2026-03-01T23:59:59-05:00',
    7: '2026-03-08T23:59:59-05:00',
    8: '2026-03-22T23:59:59-05:00',
  };
  
  // Get week number from URL
  const getWeekFromUrl = () => {
    const path = window.location.pathname;
    const match = path.match(/week-(\d+)/);
    return match ? parseInt(match[1]) : 1;
  };
  
  // Calculate days late and penalty
  const getLatePenaltyInfo = (weekNum) => {
    const dueString = WEEK_DUE_DATES[weekNum];
    if (!dueString) return { daysLate: 0, penaltyPercent: 0, isZero: false };
    
    const dueDate = new Date(dueString);
    const now = new Date();
    
    if (now <= dueDate) return { daysLate: 0, penaltyPercent: 0, isZero: false };
    
    const diffMs = now.getTime() - dueDate.getTime();
    const daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (daysLate > 3) {
      return { daysLate, penaltyPercent: 100, isZero: true };
    }
    
    return { daysLate, penaltyPercent: daysLate * 10, isZero: false };
  };
  
  // Display late penalty warning if applicable
  const weekNum = getWeekFromUrl();
  const penaltyInfo = getLatePenaltyInfo(weekNum);
  
  if (penaltyInfo.daysLate > 0 && submitBtn) {
    let warningDiv = document.getElementById("late-penalty-warning");
    if (!warningDiv) {
      warningDiv = document.createElement("div");
      warningDiv.id = "late-penalty-warning";
      warningDiv.style.cssText = "background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; color: #f59e0b;";
      submitBtn.parentNode.insertBefore(warningDiv, submitBtn);
    }
    
    if (penaltyInfo.isZero) {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This homework is ${penaltyInfo.daysLate} days past due. Submissions more than 3 days late receive 0 points. Contact your instructor for an extension.`;
      warningDiv.style.borderColor = "#ef4444";
      warningDiv.style.background = "rgba(239, 68, 68, 0.15)";
      warningDiv.style.color = "#ef4444";
    } else {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This homework is ${penaltyInfo.daysLate} day${penaltyInfo.daysLate > 1 ? 's' : ''} past due. A ${penaltyInfo.penaltyPercent}% penalty will be applied to your score.`;
    }
  }
  
  // Check for existing submission
  try {
    const response = await fetch("/api/get-submission?week=01&type=homework");
    if (response.ok) {
      const data = await response.json();
      if (data.submission) {
        const date = new Date(data.submission.submittedAt);
        lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
        if (data.submission.reflection) {
          reflectionInput.value = data.submission.reflection;
        }
      }
    }
  } catch (err) {
    console.log("No previous submission found");
  }
  
  submitBtn.addEventListener("click", async () => {
    const reflection = reflectionInput.value.trim();
    
    if (!reflection) {
      statusDiv.style.color = "#f44336";
      statusDiv.textContent = "\u2717 Please write your reflection before submitting.";
      return;
    }
    
    if (reflection.length < 50) {
      statusDiv.style.color = "#f44336";
      statusDiv.textContent = "\u2717 Please write at least 3-5 sentences for your reflection.";
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    statusDiv.textContent = "";
    
    try {
      // Get code from Monaco editor
      const editorInstances = window.monacoEditorInstances;
      const editor = editorInstances ? editorInstances["week-01-homework"] : null;
      if (!editor) {
        throw new Error("Editor instance not found");
      }
      
      const code = editor.getValue();
      
      // Submit to API
      const response = await fetch("/api/submit-homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          starterId: "week-01-homework",
          code: code,
          reflection: reflection,
          stdin: "",
          stdout: "",
          stderr: "",
          diagnostics: []
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        statusDiv.style.color = "#4CAF50";
        statusDiv.textContent = "\u2713 Homework submitted successfully!";
        const date = new Date(data.submittedAt);
        lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
      } else {
        throw new Error(data.error || "Submission failed");
      }
    } catch (error) {
      console.error("Submission error:", error);
      statusDiv.style.color = "#f44336";
      statusDiv.textContent = "\u2717 Error: " + error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Homework";
    }
  });
});

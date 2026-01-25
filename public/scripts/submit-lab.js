// Lab submission script - fetches code from cloud and submits with AI grading
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-lab-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  const aiFeedbackDiv = document.getElementById("ai-feedback");
  
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
  
  // Wait for auth to be ready
  const waitForAuth = async () => {
    let attempts = 0;
    while (!window.__auth) {
      if (attempts++ > 50) return null;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.__auth;
  };

  const getAccessToken = async () => {
    const auth = await waitForAuth();
    if (!auth) return null;
    try {
      return await auth.getAccessToken();
    } catch (err) {
      console.error("Failed to get token:", err);
      return null;
    }
  };

  // Get starterId from URL or default
  const getStarterId = () => {
    // Check if on lab page - extract from URL
    const path = window.location.pathname;
    if (path.includes('/week-02/lab')) {
      return 'week-02-lab';
    }
    if (path.includes('/week-01/lab')) {
      return 'week-01-lab-1';
    }
    return 'week-01-lab-1'; // default
  };

  const starterId = getStarterId();
  
  // Get week number from starterId
  const getWeekNumber = (id) => {
    const match = id.match(/week-(\d+)/);
    return match ? match[1] : '01';
  };
  
  const weekNumber = getWeekNumber(starterId);
  
  // Display late penalty warning if applicable
  const weekNum = parseInt(weekNumber);
  const penaltyInfo = getLatePenaltyInfo(weekNum);
  
  if (penaltyInfo.daysLate > 0) {
    // Create or update late warning div
    let warningDiv = document.getElementById("late-penalty-warning");
    if (!warningDiv) {
      warningDiv = document.createElement("div");
      warningDiv.id = "late-penalty-warning";
      warningDiv.style.cssText = "background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; color: #f59e0b;";
      submitBtn.parentNode.insertBefore(warningDiv, submitBtn);
    }
    
    if (penaltyInfo.isZero) {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This lab is ${penaltyInfo.daysLate} days past due. Submissions more than 3 days late receive 0 points. Contact your instructor for an extension.`;
      warningDiv.style.borderColor = "#ef4444";
      warningDiv.style.background = "rgba(239, 68, 68, 0.15)";
      warningDiv.style.color = "#ef4444";
    } else {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This lab is ${penaltyInfo.daysLate} day${penaltyInfo.daysLate > 1 ? 's' : ''} past due. A ${penaltyInfo.penaltyPercent}% penalty will be applied to your score.`;
    }
  }
  
  // Check for existing submission
  try {
    const token = await getAccessToken();
    if (token) {
      const response = await fetch(`/.netlify/functions/get-submission?week=${weekNumber}&type=lab`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.submission) {
          const date = new Date(data.submission.submittedAt);
          lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
          
          // Show previous AI feedback if available
          if (data.submission.aiFeedback && aiFeedbackDiv) {
            aiFeedbackDiv.style.display = "block";
            aiFeedbackDiv.innerHTML = `
              <strong>Previous Grade: ${data.submission.aiGrade}/100</strong>
              <p style="margin: 0.5rem 0 0 0;">${data.submission.aiFeedback}</p>
            `;
          }
        }
      }
    }
  } catch (err) {
    console.log("No previous submission found:", err);
  }
  
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting & Grading...";
    statusDiv.textContent = "";
    if (aiFeedbackDiv) aiFeedbackDiv.style.display = "none";
    
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Please log in to submit your lab");
      }

      let code = null;
      
      // First, try to get code from embedded Monaco editor on this page
      if (window.monacoEditorInstances) {
        const editor = window.monacoEditorInstances[starterId];
        if (editor) {
          code = editor.getValue();
        }
      }
      
      // If no embedded editor, fetch the code from cloud storage
      if (!code) {
        const codeResponse = await fetch(`/.netlify/functions/code-get?starterId=${encodeURIComponent(starterId)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (codeResponse.ok) {
          const codeData = await codeResponse.json();
          code = codeData.code;
        }
      }
      
      // If no cloud code, try to get from local storage
      if (!code) {
        const storageKey = `cis118m:${starterId}:Program.cs`;
        code = localStorage.getItem(storageKey);
      }
      
      if (!code) {
        throw new Error("No code found. Please open the editor and write your program first.");
      }
      
      // Submit to API with auth
      const response = await fetch("/.netlify/functions/submit-lab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          starterId: starterId,
          code: code,
          stdin: "",
          stdout: "",
          stderr: "",
          diagnostics: []
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        statusDiv.style.color = "#4CAF50";
        
        if (data.score !== null && data.score !== undefined) {
          statusDiv.textContent = `✓ Lab graded! Score: ${data.score}/100`;
          
          // Show AI feedback
          if (data.feedback && aiFeedbackDiv) {
            aiFeedbackDiv.style.display = "block";
            aiFeedbackDiv.innerHTML = `
              <strong style="color: #4ec9b0;">🎉 Score: ${data.score}/100</strong>
              <p style="margin: 0.5rem 0 0 0;">${data.feedback}</p>
            `;
          }
        } else {
          statusDiv.textContent = "✓ Lab submitted successfully!";
        }
        
        const date = new Date(data.submittedAt);
        lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
      } else {
        throw new Error(data.error || "Submission failed");
      }
    } catch (error) {
      console.error("Submission error:", error);
      statusDiv.style.color = "#f44336";
      statusDiv.textContent = "✗ Error: " + error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Lab for Grading";
    }
  });
});

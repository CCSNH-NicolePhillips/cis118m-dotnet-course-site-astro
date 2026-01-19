// Lab submission script - fetches code from cloud and submits with AI grading
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-lab-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  const aiFeedbackDiv = document.getElementById("ai-feedback");
  
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
    if (path.includes('/week-01/lab')) {
      return 'week-01-lab-1';
    }
    return 'week-01-lab-1'; // default
  };

  const starterId = getStarterId();
  
  // Check for existing submission
  try {
    const token = await getAccessToken();
    if (token) {
      const response = await fetch(`/.netlify/functions/get-submission?week=01&type=lab`, {
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

      // First, fetch the code from cloud storage
      const codeResponse = await fetch(`/.netlify/functions/code-get?starterId=${encodeURIComponent(starterId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let code = null;
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        code = codeData.code;
      }
      
      // If no cloud code, try to get from local storage
      if (!code) {
        const storageKey = `cis118m:${starterId}:Program.cs`;
        code = localStorage.getItem(storageKey);
      }
      
      // If still no code, check for embedded editor
      if (!code && window.monacoEditorInstances) {
        const editor = window.monacoEditorInstances[starterId];
        if (editor) {
          code = editor.getValue();
        }
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

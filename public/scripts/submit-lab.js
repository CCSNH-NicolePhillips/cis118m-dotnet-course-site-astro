// Lab submission script - fetches code from cloud and submits with AI grading
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-lab-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  const aiFeedbackDiv = document.getElementById("ai-feedback");
  
  // Bail early if required elements are missing
  if (!submitBtn) {
    console.log("[submit-lab] Submit button not found on this page, skipping.");
    return;
  }
  
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

  // Get starterId from URL or iframe - dynamically extracts the starter
  const getStarterId = () => {
    const path = window.location.pathname;
    
    // Check for boss-fight pattern first
    const bossFightMatch = path.match(/\/week-(\d+)\/.*boss-fight/);
    if (bossFightMatch) {
      const weekNum = bossFightMatch[1];
      return `week-${weekNum}-boss-fight`;
    }
    
    // Match patterns like /week-01/lab, /week-02/lab, /week-15/lab, etc.
    const labMatch = path.match(/\/week-(\d+)\/lab/);
    if (labMatch) {
      const weekNum = labMatch[1]; // e.g., "01", "02", "03", "15"
      // Week 1 uses different ID format for backwards compatibility
      if (weekNum === '01') {
        return 'week-01-lab-1';
      }
      return `week-${weekNum}-lab`;
    }
    
    // Try to get starterId from embedded iframe's src
    const iframe = document.querySelector('iframe[src*="embedded"]');
    if (iframe) {
      const iframeSrc = iframe.getAttribute('src');
      const starterMatch = iframeSrc?.match(/starter=([^&]+)/);
      if (starterMatch) {
        return starterMatch[1];
      }
    }
    
    return 'week-01-lab-1'; // default fallback
  };

  const starterId = getStarterId();
  console.log('[Submit] Using starterId:', starterId);
  
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
      // Determine submission type from starterId (boss-fight or lab)
      const submissionType = starterId.includes('boss-fight') ? 'boss-fight' : 'lab';
      const response = await fetch(`/api/get-submission?week=${weekNumber}&type=${submissionType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.submission) {
          const date = new Date(data.submission.submittedAt);
          if (lastSubmittedDiv) {
            lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
          }
          
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
  
  // Helper to get code from embedded iframe via postMessage
  const getCodeFromIframe = (starterId) => {
    return new Promise((resolve) => {
      const iframe = document.querySelector('iframe[src*="embedded"]');
      console.log('[Submit] Looking for iframe:', iframe ? 'found' : 'not found');
      if (!iframe || !iframe.contentWindow) {
        console.log('[Submit] No iframe or contentWindow');
        resolve(null);
        return;
      }
      
      const timeout = setTimeout(() => {
        console.log('[Submit] iframe timeout - no response after 2s');
        window.removeEventListener('message', handler);
        resolve(null);
      }, 2000);
      
      const handler = (event) => {
        console.log('[Submit] Received message:', event.data);
        if (event.data?.type === 'codeResponse' && event.data?.starterId === starterId) {
          console.log('[Submit] Got code response from iframe');
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve(event.data.code);
        }
      };
      
      window.addEventListener('message', handler);
      console.log('[Submit] Sending getCode to iframe for starterId:', starterId);
      iframe.contentWindow.postMessage({ type: 'getCode', starterId }, '*');
    });
  };
  
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
          console.log('[Submit] Got code from monacoEditorInstances');
        }
      }
      
      // Try to get from embedded iframe via postMessage
      if (!code) {
        console.log('[Submit] Trying to get code from iframe...');
        code = await getCodeFromIframe(starterId);
        if (code) console.log('[Submit] Got code from iframe');
      }
      
      // If no embedded editor, fetch the code from cloud storage
      if (!code) {
        console.log('[Submit] Trying to fetch code from cloud...');
        const codeResponse = await fetch(`/api/code-get?starterId=${encodeURIComponent(starterId)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('[Submit] Cloud response status:', codeResponse.status);
        if (codeResponse.ok) {
          const codeData = await codeResponse.json();
          code = codeData.code;
          console.log('[Submit] Got code from cloud:', code ? 'yes' : 'no');
        }
      }
      
      // If no cloud code, try to get from local storage
      if (!code) {
        console.log('[Submit] Trying localStorage...');
        const storageKey = `cis118m:${starterId}:Program.cs`;
        code = localStorage.getItem(storageKey);
        console.log('[Submit] Got code from localStorage:', code ? 'yes' : 'no');
      }
      
      if (!code) {
        throw new Error("No code found. Please open the editor and write your program first.");
      }
      
      console.log('[Submit] Submitting code, length:', code.length);
      
      // Submit to API with auth
      const response = await fetch("/api/submit-lab", {
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
          
          // Show AI feedback with late penalty info if applicable
          if (aiFeedbackDiv) {
            aiFeedbackDiv.style.display = "block";
            
            if (data.isLate && data.originalScore !== null && data.originalScore !== data.score) {
              // Late submission - show both scores
              aiFeedbackDiv.innerHTML = `
                <strong style="color: #4ec9b0;">🎉 Final Score: ${data.score}/100</strong>
                <div style="margin-top: 8px; padding: 10px; background: rgba(240, 173, 78, 0.1); border: 1px solid rgba(240, 173, 78, 0.3); border-radius: 4px;">
                  <strong style="color: #f0ad4e;">⚠️ Late Submission Penalty Applied</strong>
                  <div style="margin-top: 5px; font-size: 0.85rem; color: #f0ad4e;">
                    • Original Score: <span style="color: #4ec9b0;">${data.originalScore}/100</span><br/>
                    • Days Late: ${data.daysLate} day${data.daysLate !== 1 ? 's' : ''}<br/>
                    • Penalty: -${data.penaltyPercent}% (${data.daysLate <= 7 ? '10% per day' : 'max 70% after 7 days'})<br/>
                    • Final Score: <span style="color: ${data.score >= 70 ? '#4ec9b0' : '#ce9178'};">${data.score}/100</span>
                  </div>
                </div>
                ${data.feedback ? `<p style="margin: 0.5rem 0 0 0;">${data.feedback}</p>` : ''}
              `;
            } else {
              // On-time submission
              aiFeedbackDiv.innerHTML = `
                <strong style="color: #4ec9b0;">🎉 Score: ${data.score}/100</strong>
                ${data.feedback ? `<p style="margin: 0.5rem 0 0 0;">${data.feedback}</p>` : ''}
              `;
            }
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

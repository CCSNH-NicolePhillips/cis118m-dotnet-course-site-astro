// Code submission script - fetches code from cloud and submits with AI grading
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
  
  // Due dates per week - fetched from /api/due-dates (backed by src/config/site.ts)
  let WEEK_DUE_DATES = {};
  try {
    const dueDatesRes = await fetch('/api/due-dates');
    if (dueDatesRes.ok) WEEK_DUE_DATES = await dueDatesRes.json();
  } catch (err) {
    console.warn('[submit-lab] Could not load due dates:', err);
  }
  
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

  // Get starterId from button data, URL, or iframe - dynamically extracts the starter
  const getStarterId = () => {
    const explicitStarterId = submitBtn?.dataset?.starterId?.trim();
    if (explicitStarterId) {
      return explicitStarterId;
    }

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

    const finalMatch = path.match(/\/week-(\d+)\/final-project/);
    if (finalMatch) {
      return `week-${finalMatch[1]}-final`;
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
  const submissionType = (() => {
    const explicitType = submitBtn?.dataset?.submissionType?.trim();
    if (explicitType) {
      return explicitType;
    }
    if (starterId.includes('boss-fight')) {
      return 'boss-fight';
    }
    if (starterId.endsWith('-final')) {
      return 'final';
    }
    return 'lab';
  })();
  const assignmentLabel = (() => {
    const explicitLabel = submitBtn?.dataset?.assignmentLabel?.trim();
    if (explicitLabel) {
      return explicitLabel;
    }
    if (submissionType === 'final') {
      return 'Final Project';
    }
    if (submissionType === 'boss-fight') {
      return 'Boss Fight';
    }
    return 'Lab';
  })();
  const assignmentLabelLower = assignmentLabel.toLowerCase();
  const submitButtonLabel = submitBtn?.dataset?.submitLabel?.trim() || `Submit ${assignmentLabel}`;
  console.log('[Submit] Using starterId:', starterId);
  
  // Get week number from starterId
  const getWeekNumber = (id) => {
    const match = id.match(/week-(\d+)/);
    return match ? match[1] : '01';
  };
  
  const weekNumber = getWeekNumber(starterId);
  
  // Grace period constants
  const GRACE_PERIOD_START = '2026-05-04T00:00:00-04:00';
  const GRACE_PERIOD_END   = '2026-05-09T23:59:59-04:00';
  const GRACE_PERIOD_CAP   = 70;
  const isGracePeriodActive = () => {
    const now = new Date();
    return now >= new Date(GRACE_PERIOD_START) && now <= new Date(GRACE_PERIOD_END);
  };
  
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
    
    if (isGracePeriodActive() && weekNum < 15) {
      warningDiv.innerHTML = `<strong>Recovery Window Active:</strong> Missing work from Weeks 01-14 may still be submitted during Week 15. The maximum score for this ${assignmentLabelLower} is capped at ${GRACE_PERIOD_CAP}/100.`;
      warningDiv.style.borderColor = "#eab308";
      warningDiv.style.background = "rgba(234, 179, 8, 0.15)";
      warningDiv.style.color = "#eab308";
    } else if (penaltyInfo.isZero) {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This ${assignmentLabelLower} is ${penaltyInfo.daysLate} days past due. Submissions more than 3 days late receive 0 points. Contact your instructor for an extension.`;
      warningDiv.style.borderColor = "#ef4444";
      warningDiv.style.background = "rgba(239, 68, 68, 0.15)";
      warningDiv.style.color = "#ef4444";
    } else {
      warningDiv.innerHTML = `⚠️ <strong>Late Submission Warning:</strong> This ${assignmentLabelLower} is ${penaltyInfo.daysLate} day${penaltyInfo.daysLate > 1 ? 's' : ''} past due. A ${penaltyInfo.penaltyPercent}% penalty will be applied to your score.`;
    }
  }
  
  // Check for existing submission
  let existingGrade = null; // Track existing grade for resubmission confirmation
  try {
    const token = await getAccessToken();
    if (token) {
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
          
          // Store existing grade for resubmission confirmation
          if (data.submission.aiGrade !== null && data.submission.aiGrade !== undefined) {
            existingGrade = data.submission.aiGrade;
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
        resolve({ code: null, telemetry: null });
        return;
      }
      
      const timeout = setTimeout(() => {
        console.log('[Submit] iframe timeout - no response after 2s');
        window.removeEventListener('message', handler);
        resolve({ code: null, telemetry: null });
      }, 2000);
      
      const handler = (event) => {
        console.log('[Submit] Received message:', event.data);
        if (event.data?.type === 'codeResponse' && event.data?.starterId === starterId) {
          console.log('[Submit] Got code response from iframe');
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve({ code: event.data.code, telemetry: event.data.telemetry || null });
        }
      };
      
      window.addEventListener('message', handler);
      console.log('[Submit] Sending getCode to iframe for starterId:', starterId);
      iframe.contentWindow.postMessage({ type: 'getCode', starterId }, '*');
    });
  };

  // Collect editor telemetry from the page-level tracker
  const collectTelemetry = (starterId, code) => {
    const t = window.__editorTelemetry?.[starterId];
    if (!t) return null;
    return {
      keystrokeCount: t.keystrokeCount || 0,
      pasteCount: t.pasteCount || 0,
      pasteCharTotal: t.pasteCharTotal || 0,
      largestPaste: t.largestPaste || 0,
      editDurationSec: t.editStartTime && t.lastEditTime ? Math.round((t.lastEditTime - t.editStartTime) / 1000) : 0,
      totalEdits: t.totalEdits || 0,
      codeLength: code?.length || 0
    };
  };
  
  submitBtn.addEventListener("click", async () => {
    // Resubmission confirmation — warn if student already has a grade
    if (existingGrade !== null) {
      let confirmMsg = `You already have a grade of ${existingGrade}/100 for this ${assignmentLabelLower}.\n\nResubmitting will re-grade your work and replace your current score.`;
      if (penaltyInfo.daysLate > 0) {
        if (isGracePeriodActive() && weekNum < 15) {
          confirmMsg += `\n\nRECOVERY WINDOW: Missing work from Weeks 01-14 is capped at ${GRACE_PERIOD_CAP}/100 during Week 15.`;
        } else if (penaltyInfo.isZero) {
          confirmMsg += `\n\n⚠️ WARNING: This ${assignmentLabelLower} is ${penaltyInfo.daysLate} days past due. Submissions more than 3 days late receive 0 points.`;
        } else {
          confirmMsg += `\n\n⚠️ WARNING: This ${assignmentLabelLower} is ${penaltyInfo.daysLate} day${penaltyInfo.daysLate > 1 ? 's' : ''} past due. A ${penaltyInfo.penaltyPercent}% late penalty will be applied to your new score.`;
        }
      }
      confirmMsg += '\n\nAre you sure you want to resubmit?';
      if (!confirm(confirmMsg)) {
        return; // Student cancelled
      }
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = `Submitting ${assignmentLabel}...`;
    statusDiv.textContent = "";
    if (aiFeedbackDiv) aiFeedbackDiv.style.display = "none";
    
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error(`Please log in to submit your ${assignmentLabelLower}`);
      }

      let code = null;
      let telemetryData = null;
      
      // First, try to get code from embedded Monaco editor on this page
      if (window.monacoEditorInstances) {
        const editor = window.monacoEditorInstances[starterId];
        if (editor) {
          code = editor.getValue();
          telemetryData = collectTelemetry(starterId, code);
          console.log('[Submit] Got code from monacoEditorInstances');
        }
      }
      
      // Try to get from embedded iframe via postMessage
      if (!code) {
        console.log('[Submit] Trying to get code from iframe...');
        const iframeResult = await getCodeFromIframe(starterId);
        code = iframeResult.code;
        telemetryData = iframeResult.telemetry;
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
          diagnostics: [],
          telemetry: telemetryData
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        statusDiv.style.color = "#4CAF50";
        
        if (data.score !== null && data.score !== undefined) {
          statusDiv.textContent = `✓ ${assignmentLabel} graded! Score: ${data.score}/100`;
          
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
          statusDiv.textContent = `✓ ${assignmentLabel} submitted successfully!`;

          if (aiFeedbackDiv && data.feedback) {
            aiFeedbackDiv.style.display = "block";
            aiFeedbackDiv.innerHTML = `
              <strong style="color: #4ec9b0;">Submission received</strong>
              <p style="margin: 0.5rem 0 0 0;">${data.feedback}</p>
            `;
          }
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
      submitBtn.textContent = submitButtonLabel;
    }
  });
});

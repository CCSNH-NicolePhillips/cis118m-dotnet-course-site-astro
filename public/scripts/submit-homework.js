// Homework submission script
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-homework-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  const reflectionInput = document.getElementById("reflection-input");
  
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

// Lab submission script
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-lab-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  
  // Check for existing submission
  try {
    const response = await fetch("/api/get-submission?week=01&type=lab");
    if (response.ok) {
      const data = await response.json();
      if (data.submission) {
        const date = new Date(data.submission.submittedAt);
        lastSubmittedDiv.textContent = "Last submitted: " + date.toLocaleString();
      }
    }
  } catch (err) {
    console.log("No previous submission found");
  }
  
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    statusDiv.textContent = "";
    
    try {
      // Get code from Monaco editor
      const editorContainer = document.querySelector(".monaco-editor-container");
      if (!editorContainer) {
        throw new Error("Editor not found");
      }
      
      // Access the Monaco editor instance
      const editorInstances = window.monacoEditorInstances;
      const editor = editorInstances ? editorInstances["week-01-lab-1"] : null;
      if (!editor) {
        throw new Error("Editor instance not found");
      }
      
      const code = editor.getValue();
      
      // Submit to API
      const response = await fetch("/api/submit-lab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          starterId: "week-01-lab-1",
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
        statusDiv.textContent = "\u2713 Lab submitted successfully!";
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
      submitBtn.textContent = "Submit Lab";
    }
  });
});

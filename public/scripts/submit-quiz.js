// Quiz submission script
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submit-quiz-btn");
  const statusDiv = document.getElementById("submit-status");
  const lastSubmittedDiv = document.getElementById("last-submitted");
  
  // Check for existing submission
  try {
    const response = await fetch("/api/get-submission?week=01&type=quiz");
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
    // Validate required questions
    const q1 = document.querySelector("input[name=\"q1\"]:checked");
    const q2 = document.querySelector("input[name=\"q2\"]:checked");
    
    if (!q1 || !q2) {
      statusDiv.style.color = "#f44336";
      statusDiv.textContent = "\u2717 Please answer all required questions (1 and 2).";
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    statusDiv.textContent = "";
    
    try {
      // Collect answers
      const q3Checkboxes = document.querySelectorAll("input[name^=\"q3-\"]:checked");
      const q3Answers = Array.from(q3Checkboxes).map(function(cb) { return cb.name.replace("q3-", ""); });
      const q4Feedback = document.getElementById("q4-feedback").value;
      
      const answers = {
        q1: q1.value,
        q2: q2.value,
        q3: q3Answers,
        q4: q4Feedback || ""
      };
      
      // Submit to API
      const response = await fetch("/api/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: answers })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        statusDiv.style.color = "#4CAF50";
        statusDiv.textContent = "\u2713 Quiz submitted successfully! Week 1 complete!";
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
      submitBtn.textContent = "Submit Quiz";
    }
  });
});

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { 
      statusCode: 400, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }) 
    };
  }

  const { message, pageId, lessonContext } = body;

  if (!message) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Message is required" })
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 300,
    }
  });

  const prompt = `You are a Senior .NET Engineer mentoring a freshman programming student.

MISSION INTEL: ${lessonContext || "General .NET programming assistance."}

STRICT RULES - YOU MUST FOLLOW THESE:
1. SOCRATIC METHOD ONLY: Never give code snippets or the direct answer. Guide them to discover it.
2. GUIDANCE: If they're stuck, ask a question about the 'mechanics' (e.g., 'What tells the engine one instruction is finished?' or 'What container type holds whole numbers?').
3. SCOPE: Only discuss .NET, C#, and programming concepts. For other topics, say: "That's off-comms, Engineer. Let's focus on the mission."
4. VALIDATION: If they explain the logic correctly, say: "Mission Objective Confirmed! You've got the logic, now implement it."
5. ENCOURAGEMENT: Be supportive but don't do their work for them. They need to learn by doing.
6. BREVITY: Keep responses short and focused - 2-3 sentences max unless explaining a concept.

STUDENT MESSAGE: "${message}"

Respond as the Senior Engineer mentor:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error('[ai-tutor] Error:', error.message || error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Comms link temporarily down. Try again." })
    };
  }
}

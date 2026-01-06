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

  const { message, pageId, lessonContext, studentName } = body;

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

  // Use first name or "Recruit" as fallback
  const name = studentName ? studentName.split(' ')[0] : 'Recruit';

  const prompt = `You are a Senior .NET Engineer mentoring a freshman student named ${name}.
Mission Intel: ${lessonContext || "General .NET programming assistance."}

STRICT OPERATING PROTOCOLS:
1. SOCRATIC ONLY: Never provide code or direct answers. If they ask 'What is the answer?', tell them: 'Negative, ${name}. We need to calibrate your internal logic first.'
2. MECHANICAL ANALOGY: Always use the 'Blueprint vs. Engine' analogy.
   - C# = The Blueprint (Static instructions).
   - CLR = The Engine (The active machine that reads the blueprint).
   - Semicolon = The Signal (Tells the engine one instruction is complete).
3. HANDLING SHORT ANSWERS: If ${name} gives a short or vague answer (like 'it sits there' or 'a semicolon'), do not just ask 'Can you elaborate?'. Instead, shift gears to a mechanical question:
   - Example: If they say 'It sits there', ask: 'If the blueprint is just sitting on the desk, does the Engine know how to start? What component picks up that blueprint and starts the ignition?'
4. VALIDATION: If they correctly link the CLR to running the code OR the semicolon to structural integrity, say: '📡 MISSION OBJECTIVE CONFIRMED.' Then pivot to the next part of the mission.
5. SCOPE: Only discuss .NET, C#, and programming concepts. For other topics, say: "That's off-comms, ${name}. Let's focus on the mission."
6. PERSONALIZATION: Address ${name} by name occasionally to keep it personal. Be encouraging but firm.
7. BREVITY: Keep responses to 2-3 sentences max unless explaining a core concept.

${name} says: "${message}"

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

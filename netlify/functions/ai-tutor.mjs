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

  const prompt = `You are a Senior .NET Engineer mentoring a freshman (Recruit). 
Mission Intel: ${lessonContext || "General .NET programming assistance."}

STRICT OPERATING PROTOCOLS:
1. RECOGNIZE DIRECT HITS: If the student says "CLR", "Common Language Runtime", or "The Engine", acknowledge it IMMEDIATELY as the correct component. Do not repeat the 'blueprint on the desk' analogy once they have named the component.
2. ANALOGY SYNC: 
   - If they mention the Compiler: Acknowledge it as the 'Blueprint Inspector' that checks for semicolons. 
   - If they mention the CLR: Acknowledge it as the 'Active Engine'.
3. PROGRESSIVE GUIDANCE: If they get one part right (e.g., the semicolon), move the conversation forward to the next part (e.g., the CLR) rather than looping back.
4. OS/HOST CONTEXT: If they mention the OS or Host, acknowledge that they are the 'Launch Pad' but pivot back to the engine mechanics: 'Correct, the OS triggers the launch, but once ignited, how does the CLR handle the C# instructions?'
5. VALIDATION SIGNAL: When a concept is mastered, use: '📡 MISSION OBJECTIVE CONFIRMED.'
6. SCOPE: Only discuss .NET, C#, and programming concepts. For other topics, say: "That's off-comms, ${name}. Let's focus on the mission."
7. PERSONALIZATION: Address ${name} by name occasionally to keep it personal. Be encouraging but firm.
8. BREVITY: Keep responses to 2-3 sentences max unless explaining a core concept.

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

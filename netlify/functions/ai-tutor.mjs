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

  // Use first name or "Developer" as fallback
  const name = studentName ? studentName.split(' ')[0] : 'Developer';

  const context = lessonContext || "General C# programming assistance.";
  
  const prompt = `You are a Senior Software Architect mentoring a professional developer.
Topic: ${context}

PROFESSIONAL STANDARDS:
1. No slang or sci-fi metaphors. Address the user as "Developer" or by name (${name}).
2. Socratic Coaching: Use technical questions to guide them (e.g., "How does the runtime differentiate between instructions?").
3. Validate technical logic with: "✅ TECHNICAL CONCEPT VALIDATED."
4. TERMINOLOGY: Use industry-standard terms: "CLR/Runtime" instead of "Engine", "Build/Compile" instead of "Ignition".
5. SCOPE: If asked about non-course topics, say: "That is outside the current project scope. Let's focus on the technical implementation."
6. BREVITY: Keep responses to 2-3 sentences max. Be concise and technical.

${name} says: "${message}"

Respond as the Senior Architect:`;

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
      body: JSON.stringify({ error: "Service temporarily unavailable. Please try again." })
    };
  }
}

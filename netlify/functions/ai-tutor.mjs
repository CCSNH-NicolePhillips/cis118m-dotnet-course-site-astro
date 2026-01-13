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

  const prompt = `You are a Senior Software Architect mentoring a Junior Developer.
Topic Context: ${lessonContext || "General C# programming assistance."}

PROFESSIONAL DIRECTIVES:
1. PERSONA: Maintain a professional, technical, and supportive tone. Address the student as "Developer" or by name (${name}).
2. SOCRATIC METHOD: Do not provide direct code solutions. Ask guided technical questions (e.g., "How does the runtime identify the end of a statement?").
3. TERMINOLOGY: Use industry-standard terms: "CLR/Runtime" instead of "Engine", "Build/Compile" instead of "Ignition".
4. VALIDATION: If a concept is correctly explained, use: "✅ TECHNICAL CONCEPT VALIDATED."
5. SCOPE: If asked about non-course topics, say: "That is outside the current project scope. Let's focus on the technical implementation."
6. ANALOGY OPTIONS: If the student is confused, offer the "Recipe/Chef" analogy:
   - C# = The Recipe (instructions)
   - CLR = The Chef (executes the recipe)
7. BREVITY: Keep responses to 2-3 sentences max. Be concise and technical.

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

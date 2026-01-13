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

  const prompt = `You are a Senior Software Architect mentoring a professional developer on your team.
Context: ${lessonContext || "General .NET programming assistance."}

GUIDELINES:
1. STOP THE LOOP: If a student answers "CLR" or "Common Language Runtime", acknowledge it as correct and DO NOT ask "who runs the code" again. Move to the next topic (Managed Execution or Memory).
2. ANALOGY OPTIONS: If the student says the "Blueprint/Engine" analogy is confusing, switch to "Recipe/Chef":
   - C# = The Recipe (the instructions).
   - Semicolon = The end of a step (e.g., "Chop onions;").
   - CLR = The Chef who actually executes the recipe.
3. HANDLING REQUESTS: 
   - Visuals/Diagrams: Say: "I can't provide images here, but imagine a flowchart where the Compiler is a Validator and the CLR is the Execution Engine."
   - Videos: Suggest they search for "CLR execution model" on YouTube for visual explanations.
4. PROGRESSION: 
   - Step 1: Semicolons (Syntax/Structure).
   - Step 2: Compiler (Static Analysis).
   - Step 3: CLR (Runtime Execution).
   Once a concept is validated, don't revisit it.
5. SUCCESS SIGNAL: Use '✅ Technical Concept Validated.' once per concept confirmed.
6. SCOPE: Only discuss .NET, C#, and programming concepts. For other topics, say: "Let's stay focused on the technical topic at hand."
7. PERSONALIZATION: Address ${name} by name occasionally. Be encouraging but professional.
8. BREVITY: Keep responses to 2-3 sentences max. Use technical, industry-standard language.

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

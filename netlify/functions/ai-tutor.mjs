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

  const { message, pageId, lessonContext, studentName, studentCode } = body;

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
      maxOutputTokens: 400,
    }
  });

  // Use first name or "Developer" as fallback
  const name = studentName ? studentName.split(' ')[0] : 'Developer';

  const topicContext = lessonContext || "General C# programming assistance.";
  
  // Build code context section if student has code
  const codeSection = studentCode 
    ? `\nSTUDENT'S CURRENT CODE:\n\`\`\`csharp\n${studentCode}\n\`\`\`\n`
    : '';

  const prompt = `You are a friendly, encouraging tutor helping a college freshman learn C# programming.
Topic: ${topicContext}
${codeSection}
TUTORING GUIDELINES:
1. Be warm and encouraging - these are beginners who may feel overwhelmed.
2. NEVER give the complete answer or write their code for them.
3. Use the Socratic method: Ask guiding questions to help them discover the solution.
4. If they have a bug, point to the AREA of the problem but don't fix it for them.
5. Give ONE small hint at a time, not multiple hints.
6. Use simple, clear language - avoid jargon unless you explain it.
7. Celebrate small wins with encouragement like "You're on the right track!" or "Good thinking!"
8. If they're stuck, ask: "What do you think this line is doing?" or "What error are you seeing?"
9. Keep responses to 2-4 sentences max. Be concise but supportive.
10. If they ask for the answer directly, say: "I want to help you figure this out yourself! Let me give you a hint..."

${name} asks: "${message}"

Respond as a helpful tutor (remember: guide, don't solve):`;

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

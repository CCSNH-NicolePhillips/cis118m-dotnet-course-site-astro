/**
 * AI Tutor API - "Senior Engineer" Socratic Mentor
 * 
 * Uses Gemini 2.0 Flash for conversational AI tutoring.
 * Never gives direct answers - guides students through Socratic questioning.
 * 
 * TOKEN LIMIT: 300 output tokens max
 * ESTIMATED COST: ~$0.00012 per request
 */

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
      maxOutputTokens: 300,  // Keep responses brief
    }
  });

  // Use first name or "Recruit" as fallback
  const name = studentName ? studentName.split(' ')[0] : 'Recruit';

  const prompt = `You are a Senior .NET Engineer mentoring a freshman (Recruit). 
Mission Intel: ${lessonContext || "General .NET programming assistance."}

CORE DIRECTIVES:
1. TYPO TOLERANCE: Never mock, repeat, or highlight student typos or spelling errors (e.g., if they type 'reds it' instead of 'reads it', ignore the error and respond to the technical meaning). 
2. NO REPETITION: Once a student correctly identifies a concept (like the CLR or Semicolon), do not repeat the "blueprint" analogy for that concept. Move forward immediately.
3. RECOGNIZE SUCCESS: If they say "CLR", "Common Language Runtime", or "Engine", acknowledge it as the correct component. 
4. SUCCESS SIGNAL: When a concept is mastered, use: '📡 MISSION OBJECTIVE CONFIRMED.'
5. SCOPE: Only discuss .NET, C#, and programming concepts. For other topics, say: "That's off-comms, ${name}. Let's focus on the mission."
6. PERSONALIZATION: Address ${name} by name occasionally to keep it personal. Be encouraging but firm.
7. BREVITY: Keep responses to 2-3 sentences max.

TECHNICAL GUIDANCE:
- If they get the Semicolon right: Shift focus to the Engine (CLR).
- If they get the CLR right: Ask how the Engine knows the blueprint is valid before it starts.
- If they are stuck on the CLR: Ask: 'What part of the system actually executes the instructions once the Inspector (Compiler) is done?'

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

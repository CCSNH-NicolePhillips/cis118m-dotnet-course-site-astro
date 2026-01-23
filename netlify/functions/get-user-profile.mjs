import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Get user's profile (displayName, etc.)
 * 
 * GET /api/get-user-profile
 * Headers: Authorization: Bearer <token>
 * Returns: { displayName: string | null }
 */
export default async function handler(request, context) {
  try {
    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify authentication
    const user = await requireAuth(request);

    const redis = getRedis();
    const userId = user.sub;

    // Get display name and onboarding status from Redis
    const displayName = await redis.get(`cis118m:displayName:${userId}`);
    const onboardingComplete = await redis.get(`cis118m:onboardingComplete:${userId}`);

    // If user has a displayName, they've completed onboarding (even if flag wasn't set)
    const isOnboardingComplete = onboardingComplete === 'true' || !!displayName;

    console.log('[get-user-profile] userId:', userId, 'displayName:', displayName, 'onboardingComplete:', isOnboardingComplete);

    return new Response(
      JSON.stringify({ 
        displayName: displayName || null,
        onboardingComplete: isOnboardingComplete
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[get-user-profile] Error:", err);
    
    if (err.message?.includes("No authorization header") || err.message?.includes("Invalid token")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

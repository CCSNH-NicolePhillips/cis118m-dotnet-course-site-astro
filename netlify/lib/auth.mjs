import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks = null;

/**
 * Verify Auth0 JWT token and extract user info
 * @param {string} token - The Bearer token from Authorization header
 * @returns {Promise<{sub: string, email?: string}>} User info from token
 * @throws {Error} If token is invalid or verification fails
 */
export async function verifyToken(token) {
  if (!token) {
    throw new Error("No token provided");
  }

  // Remove "Bearer " prefix if present
  const jwt = token.startsWith("Bearer ") ? token.slice(7) : token;

  const domain = process.env.PUBLIC_AUTH0_DOMAIN;
  if (!domain) {
    throw new Error("AUTH0_DOMAIN not configured");
  }

  // Initialize JWKS only once
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }

  try {
    // Verify the JWT
    const { payload } = await jwtVerify(jwt, jwks, {
      issuer: `https://${domain}/`,
      audience: process.env.AUTH0_AUDIENCE || undefined,
    });

    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Extract and verify token from request headers
 * @param {Request} request - The incoming request
 * @returns {Promise<{sub: string, email?: string}>} User info
 * @throws {Error} If authorization fails
 */
export async function requireAuth(request) {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  return await verifyToken(authHeader);
}

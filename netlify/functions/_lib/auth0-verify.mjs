import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks = null;

/**
 * Fetch user info from Auth0's /userinfo endpoint
 * @param {string} accessToken - The access token (without Bearer prefix)
 * @returns {Promise<{email?: string, name?: string}>} User info
 */
async function fetchUserInfo(accessToken) {
  const domain = process.env.AUTH0_DOMAIN || process.env.PUBLIC_AUTH0_DOMAIN;
  try {
    const response = await fetch(`https://${domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      console.log('[auth0-verify] userinfo failed:', response.status);
      return {};
    }
    const data = await response.json();
    console.log('[auth0-verify] userinfo response:', JSON.stringify(data));
    return {
      email: data.email,
      name: data.name || data.nickname || null,
    };
  } catch (err) {
    console.log('[auth0-verify] userinfo error:', err.message);
    return {};
  }
}

/**
 * Verify Auth0 JWT access token with audience validation
 * @param {string} token - The Bearer token from Authorization header
 * @returns {Promise<{sub: string, email?: string}>} User info from token
 * @throws {Error} If token is invalid or verification fails
 */
export async function verifyAuth0Token(token) {
  if (!token) {
    throw new Error("No token provided");
  }

  // Remove "Bearer " prefix if present
  const jwt = token.startsWith("Bearer ") ? token.slice(7) : token;

  const domain = process.env.AUTH0_DOMAIN || process.env.PUBLIC_AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE || process.env.PUBLIC_AUTH0_AUDIENCE;
  
  if (!domain) {
    throw new Error("AUTH0_DOMAIN not configured");
  }
  
  if (!audience) {
    throw new Error("AUTH0_AUDIENCE not configured");
  }

  // Initialize JWKS only once
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }

  try {
    // Verify the JWT with RS256, issuer, and audience
    const { payload } = await jwtVerify(jwt, jwks, {
      issuer: `https://${domain}/`,
      audience: audience,
      algorithms: ["RS256"],
    });

    console.log('[auth0-verify] Token payload keys:', Object.keys(payload));
    
    // Email might be in different places depending on Auth0 config
    let email = payload.email || payload["https://ccsnh.edu/email"] || null;

    // If no email in token, fetch from userinfo endpoint
    let name = payload.name || null;
    if (!email) {
      console.log('[auth0-verify] No email in token, fetching from userinfo...');
      const userInfo = await fetchUserInfo(jwt);
      email = userInfo.email || null;
      name = userInfo.name || name;
    }

    return {
      sub: payload.sub,
      email: email,
      name: name,
    };
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Extract and verify token from request/event headers
 * For V2 Functions (Web Request): throws on error, returns user directly
 * For Handler Functions (Netlify event): returns { authorized, user, error }
 * 
 * @param {Request|object} requestOrEvent - The incoming request or Netlify event object
 * @returns {Promise<{authorized: boolean, user?: {sub: string, email?: string}, error?: string} | {sub: string, email?: string}>}
 */
export async function requireAuth(requestOrEvent) {
  // Detect if this is a V2 Function (Web Request with headers.get method)
  const isV2Function = typeof requestOrEvent.headers?.get === 'function';
  
  try {
    // Handle both Netlify event object (headers as plain object) and Web Request (headers.get)
    let authHeader;
    if (isV2Function) {
      // Web Request API style (V2 Functions)
      authHeader = requestOrEvent.headers.get("Authorization");
    } else if (requestOrEvent.headers) {
      // Netlify event style - headers is a plain object (case-insensitive keys)
      authHeader = requestOrEvent.headers.authorization || requestOrEvent.headers.Authorization;
    }
    
    if (!authHeader) {
      if (isV2Function) {
        throw new Error("No authorization header");
      }
      return { authorized: false, error: "Missing Authorization header" };
    }

    const user = await verifyAuth0Token(authHeader);
    
    // V2 Functions expect user directly, handler functions expect { authorized, user }
    if (isV2Function) {
      return user;
    }
    return { authorized: true, user };
  } catch (error) {
    if (isV2Function) {
      throw error;
    }
    return { authorized: false, error: error.message };
  }
}

/**
 * Require instructor access (must be @ccsnh.edu but NOT @students.ccsnh.edu)
 * For V2 Functions (Web Request): throws on error, returns user directly
 * For Handler Functions (Netlify event): returns { authorized, user, error }
 * 
 * @param {Request|object} requestOrEvent - The incoming request or Netlify event object
 * @returns {Promise<{authorized: boolean, user?: {sub: string, email: string}, error?: string} | {sub: string, email: string}>}
 */
export async function requireInstructor(requestOrEvent) {
  // Detect if this is a V2 Function (Web Request with headers.get method)
  const isV2Function = typeof requestOrEvent.headers?.get === 'function';
  
  try {
    const authResult = await requireAuth(requestOrEvent);
    
    // For V2 functions, authResult is the user directly
    // For handler functions, authResult is { authorized, user, error }
    const user = isV2Function ? authResult : authResult.user;
    
    if (!isV2Function && !authResult.authorized) {
      return authResult;
    }
    
    const email = user?.email || "";
    const isInstructor = email.endsWith("@ccsnh.edu") && !email.includes("@students.");
    
    if (!isInstructor) {
      if (isV2Function) {
        throw new Error("Instructor access required. Must use @ccsnh.edu email (not @students.ccsnh.edu).");
      }
      return { authorized: false, error: "Instructor access required. Must use @ccsnh.edu email (not @students.ccsnh.edu)." };
    }
    
    return isV2Function ? user : { authorized: true, user };
  } catch (error) {
    if (isV2Function) {
      throw error;
    }
    return { authorized: false, error: error.message };
  }
}
}

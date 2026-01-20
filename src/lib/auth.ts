// Auth0 SPA SDK is loaded via CDN in the layout
// window.auth0.createAuth0Client is available globally

let client: any = null;

async function getClient() {
  if (client) {
    console.log('[Auth SDK] Returning cached client');
    return client;
  }
  
  console.log('[Auth SDK] Waiting for Auth0 CDN to load...');
  
  // Wait for auth0 to be available (loaded from CDN) with timeout
  let attempts = 0;
  while (!(window as any).auth0) {
    if (attempts++ > 100) { // 10 seconds max
      throw new Error('Auth0 CDN failed to load after 10 seconds');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('[Auth SDK] Auth0 CDN loaded, creating client...');
  
  client = await (window as any).auth0.createAuth0Client({
    domain: import.meta.env.PUBLIC_AUTH0_DOMAIN,
    clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: import.meta.env.PUBLIC_AUTH0_REDIRECT_URI,
      audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE,
      scope: "openid profile email offline_access",
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true,
  });
  
  console.log('[Auth SDK] Client created successfully');
  return client;
}

export async function login(returnTo = "/") {
  const c = await getClient();
  await c.loginWithRedirect({
    authorizationParams: { 
      redirect_uri: import.meta.env.PUBLIC_AUTH0_REDIRECT_URI,
      audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE,
      scope: "openid profile email offline_access",
    },
    appState: { returnTo },
  });
}

export async function logout() {
  const c = await getClient();
  
  // Clear user-specific cached data from localStorage
  // These are keys that store data that should not persist across user sessions
  const userSpecificKeys = [
    'cis118m:displayName',
    'cis118m:onboardingComplete',
    'cis118m:siteTourComplete',
    'cis118m:isPrivilegedUser',
    'cis118m:progress',
    'cis118m_progress_v1',
  ];
  
  userSpecificKeys.forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
  
  // Also clear any saved code (starts with cis118m: and ends with :Program.cs)
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cis118m:') && key.endsWith(':Program.cs')) {
        keysToRemove.push(key);
      }
      // Also clear lab tour keys
      if (key && key.startsWith('cis118m:lab-tour-completed:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {}
  
  // Clear the cached Auth0 client
  client = null;
  
  c.logout({ logoutParams: { returnTo: window.location.origin } });
}

export async function handleCallback() {
  const c = await getClient();
  const result = await c.handleRedirectCallback();
  return (result.appState?.returnTo as string) || "/";
}

export async function getUser(): Promise<any> {
  const c = await getClient();
  const authed = await c.isAuthenticated();
  if (!authed) return null;
  const user = await c.getUser();
  return user ?? null;
}

export async function isAuthed() {
  const c = await getClient();
  return await c.isAuthenticated();
}

export async function getAccessToken() {
  const c = await getClient();
  const authed = await c.isAuthenticated();
  if (!authed) return null;
  try {
    const token = await c.getTokenSilently({
      authorizationParams: {
        audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE,
      },
    });
    return token;
  } catch (err: any) {
    console.error("Failed to get access token:", err);
    
    // If refresh token is missing or expired, force re-login
    if (err?.message?.includes('Missing Refresh Token') || 
        err?.message?.includes('invalid_grant') ||
        err?.error === 'login_required' ||
        err?.error === 'consent_required') {
      console.log('[Auth] Session expired or invalid, forcing re-login...');
      // Clear the cached client to force fresh state
      client = null;
      // Redirect to login
      await login(window.location.pathname);
      return null;
    }
    
    return null;
  }
}

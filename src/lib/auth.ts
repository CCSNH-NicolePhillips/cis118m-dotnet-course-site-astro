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
    authorizationParams: { redirect_uri: import.meta.env.PUBLIC_AUTH0_REDIRECT_URI },
    appState: { returnTo },
  });
}

export async function logout() {
  const c = await getClient();
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
    const token = await c.getTokenSilently();
    return token;
  } catch (err) {
    console.error("Failed to get access token:", err);
    return null;
  }
}

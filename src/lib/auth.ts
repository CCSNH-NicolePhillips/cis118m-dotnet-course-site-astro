// Auth0 SPA SDK is loaded via CDN in the layout
// window.auth0.createAuth0Client is available globally

let client: any = null;

async function getClient() {
  if (client) return client;
  
  // Wait for auth0 to be available (loaded from CDN)
  while (!(window as any).auth0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Try localStorage first, fall back to memory if blocked by tracking prevention
  let cacheLocation: 'localstorage' | 'memory' = 'localstorage';
  try {
    localStorage.setItem('_auth_test', '1');
    localStorage.removeItem('_auth_test');
  } catch (e) {
    console.warn('localStorage blocked, using memory cache (session will not persist)');
    cacheLocation = 'memory';
  }
  
  client = await (window as any).auth0.createAuth0Client({
    domain: import.meta.env.PUBLIC_AUTH0_DOMAIN,
    clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: import.meta.env.PUBLIC_AUTH0_REDIRECT_URI,
    },
    cacheLocation,
    useRefreshTokens: cacheLocation === 'localstorage',
  });
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

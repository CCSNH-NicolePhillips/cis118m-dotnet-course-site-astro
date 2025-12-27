import { createAuth0Client, type Auth0Client, type User } from "@auth0/auth0-spa-js";

let client: Auth0Client | null = null;

async function getClient() {
  if (client) return client;
  client = await createAuth0Client({
    domain: import.meta.env.PUBLIC_AUTH0_DOMAIN,
    clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: import.meta.env.PUBLIC_AUTH0_REDIRECT_URI,
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true,
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

export async function getUser(): Promise<User | null> {
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

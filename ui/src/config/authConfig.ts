import { UserManager, UserManagerSettings, WebStorageStateStore } from "oidc-client-ts";
import React from "react";
import { AuthContext, AuthContextProps } from "react-oidc-context";

type RuntimeEnv = Window["_env_"] & { REACT_APP_TERRAKUBE_SEND_COOKIES?: string };

const runtimeEnv = window._env_ as RuntimeEnv;
const sendCookiesWithRequests = runtimeEnv.REACT_APP_TERRAKUBE_SEND_COOKIES?.trim().toLowerCase() === "true";

const fetchRequestCredentials: RequestCredentials = sendCookiesWithRequests ? "include" : "same-origin";

export const oidcConfig: UserManagerSettings = {
  authority: window._env_.REACT_APP_AUTHORITY,
  client_id: window._env_.REACT_APP_CLIENT_ID,
  redirect_uri: window._env_.REACT_APP_REDIRECT_URI,
  scope: window._env_.REACT_APP_SCOPE,
  fetchRequestCredentials,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};

export const mgr = new UserManager(oidcConfig);

export const useAuth = (): AuthContextProps => {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error(
      "AuthProvider context is undefined, please verify you are calling useAuth() as child of a <AuthProvider> component."
    );
  }

  return context;
};

import React, { useCallback, useEffect,useState } from 'react';
import { Platform } from 'react-native'
import * as AuthSession from 'expo-auth-session';
import {View} from "react-native";
import {
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import { KeycloakContext } from './KeycloakContext';
import useTokenStorage from './useTokenStorage';
import { handleTokenExchange, getRealmURL, generateChallenge } from './helpers';
import {
  NATIVE_REDIRECT_PATH,
} from './const';

import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();
// export interface IKeycloakConfiguration extends Partial<AuthRequestConfig> {
//   clientId: string;
//   disableAutoRefresh?: boolean;
//   nativeRedirectPath?: string;
//   realm: string;
//   refreshTimeBuffer?: number;
//   scheme?: string;
//   tokenStorageKey?: string;
//   url: string;
// }

const useProxy = Platform.select({ web: false, default: false });
export const Continue = ({ realm, clientId, url,code, extraParams, children,scopes=["openid","profile","email"],  ...options }) => {

  const discovery = useAutoDiscovery(getRealmURL({ realm, url }));
  const redirectUri =AuthSession.makeRedirectUri({
    native: `${options.scheme ?? 'exp'}://${options.nativeRedirectPath ?? NATIVE_REDIRECT_PATH}`,
    useProxy: useProxy,
  });


  const config = {
    redirectUri,
    clientId,
    realm,
    url,
    extraParams: {...extraParams,code_verifier: code.codeVerifier,code_challenge: code.codeChallenge, app_callback_uri:redirectUri  },
    scopes,
    usePKCE: true,
    codeChallengeMethod: 'S256'
  }

  const [request, response, promptAsync] = useAuthRequest(
      config,
      discovery,
  );
  const [currentToken, updateToken] = useTokenStorage(options, config, discovery)

  const handleLogin = useCallback((handler) => {
    return promptAsync({useProxy: useProxy, showInRecents: true});
  }, [request])

  const handleLogout = () => {
    if (!currentToken) throw new Error('Not logged in.');
    try {
      if (discovery.revocationEndpoint) {
        AuthSession.revokeAsync(
            { token: currentToken?.accessToken, ...config }, discovery
        )
      }
      if(discovery.endSessionEndpoint) {
        fetch(`${discovery.endSessionEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `client_id=${clientId}&refresh_token=${currentToken.refreshToken}`
        })
      }
      if(Platform.OS === 'ios') {
        AuthSession.dismiss();
      }
    } catch (error) {
      console.log(error)
    }
    updateToken(null)
  }
  useEffect(() => {
    if (response) {
      handleTokenExchange({ response, discovery, config })
          .then(updateToken)
    }
  }, [response])

  return (
      <KeycloakContext.Provider
          value={{
            isLoggedIn: currentToken === undefined ? undefined : !!currentToken,
            login: handleLogin,
            logout: handleLogout,
            ready: discovery !== null && request !== null && currentToken !== undefined,
            token: currentToken
          }}
      >
        {children}
      </KeycloakContext.Provider>
  );
};
export const KeycloakProvider = (props) => {
  const [challenge, setChallenge] = useState();
  useEffect(() => {
    generateChallenge().then((c) => setChallenge(c))
  },[])
  if(!challenge) return <View></View>
  return <Continue {...props} code={challenge}></Continue>
}

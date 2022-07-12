import * as AuthSession from "expo-auth-session";
export const getRealmURL = (config) => {
  const { url, realm } = config;
  const slash = url.endsWith('/') ? '' : '/';
  return `${url + slash}realms/${encodeURIComponent(realm)}`;
};

export function getCurrentTimeInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export const handleTokenExchange = async ({
                                            response,
                                            discovery,
                                            config,
                                          }) => {
  try {
    if (response?.type === 'success' && !!(discovery?.tokenEndpoint)) {
      const token = await AuthSession.exchangeCodeAsync(
          { code: response.params.code, ...config },
          discovery,
      );
      return token;
    }
    if (response?.type === 'error') {
      return null;
    }
    return null;
  } catch (error) {
    return null;
  }
};


import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { Buffer } from 'buffer';

function URLEncode(str) {
  return str
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
}

async function sha256(buffer) {
  return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      buffer,
      { encoding: Crypto.CryptoEncoding.BASE64 }
  );
}

function generateShortUUID() {
  return Math.random()
      .toString(36)
      .substring(2, 15);
}

export const generateChallenge = async () =>{
  const state = generateShortUUID();
  const randomBytes = await Random.getRandomBytesAsync(32);
  const base64String = Buffer.from(randomBytes).toString('base64');
  const codeVerifier = URLEncode(base64String);
  const codeChallenge = URLEncode(await sha256(codeVerifier));

  return { codeVerifier, codeChallenge, state}
}
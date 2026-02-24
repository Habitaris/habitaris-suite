/* ═══════════════════════════════════════════════════════════════
   BIOMETRIC AUTH — Touch ID / Face ID / Windows Hello
   Via WebAuthn API — works on Mac (Touch ID), iPhone (Face ID),
   Windows (Hello), Android (fingerprint)
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "hab:biometric:credential";

/**
 * Check if biometric auth is available on this device
 */
export async function isAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if a credential has been registered
 */
export function isRegistered() {
  return !!localStorage.getItem(STORAGE_KEY);
}

/**
 * Register a new biometric credential (one-time setup)
 * @param {string} userName - Display name for the credential
 * @returns {boolean} success
 */
export async function register(userName = "Habitaris Admin") {
  try {
    const available = await isAvailable();
    if (!available) throw new Error("Biometrics not available on this device");

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Habitaris Suite",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",  // Built-in (Touch ID, etc)
          userVerification: "required",         // Must verify (fingerprint/face)
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (!credential) return false;

    // Store credential ID for future authentication
    const credentialData = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      registeredAt: new Date().toISOString(),
      userName,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentialData));
    return true;
  } catch (e) {
    console.warn("Biometric registration failed:", e);
    return false;
  }
}

/**
 * Authenticate with biometric (Touch ID / Face ID)
 * @returns {boolean} success
 */
export async function authenticate() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No credential registered");

    const credentialData = JSON.parse(stored);
    const rawId = Uint8Array.from(atob(credentialData.rawId), c => c.charCodeAt(0));

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: rawId,
          type: "public-key",
          transports: ["internal"],
        }],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (e) {
    console.warn("Biometric authentication failed:", e);
    return false;
  }
}

/**
 * Remove stored credential
 */
export function remove() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get info about the stored credential
 */
export function getInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return { userName: data.userName, registeredAt: data.registeredAt };
  } catch {
    return null;
  }
}

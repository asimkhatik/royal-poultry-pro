import { Capacitor } from "@capacitor/core";
import {
  BiometricAuth,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "rb.biometric.session";
const ENABLED_KEY = "rb.biometric.enabled";

export const isNative = () => Capacitor.isNativePlatform();

export async function biometricAvailable(): Promise<{
  available: boolean;
  label: string;
}> {
  if (!isNative()) return { available: false, label: "Biometric" };
  try {
    const info = await BiometricAuth.checkBiometry();
    const label =
      info.biometryType === BiometryType.faceId ||
      info.biometryType === BiometryType.faceAuthentication
        ? "Face ID"
        : info.biometryType === BiometryType.touchId ||
            info.biometryType === BiometryType.fingerprintAuthentication
          ? "Fingerprint"
          : "Biometric";
    return { available: info.isAvailable, label };
  } catch {
    return { available: false, label: "Biometric" };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: ENABLED_KEY });
  return value === "1";
}

export async function enableBiometric(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.refresh_token) throw new Error("No active session");
  await BiometricAuth.authenticate({
    reason: "Enable biometric login for ROYAL BROILER",
    cancelTitle: "Cancel",
    androidTitle: "Enable Biometric Login",
    androidSubtitle: "Confirm your identity",
    allowDeviceCredential: false,
  });
  await Preferences.set({
    key: TOKEN_KEY,
    value: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });
  await Preferences.set({ key: ENABLED_KEY, value: "1" });
}

export async function disableBiometric(): Promise<void> {
  await Preferences.remove({ key: TOKEN_KEY });
  await Preferences.remove({ key: ENABLED_KEY });
}

export async function loginWithBiometric(): Promise<void> {
  await BiometricAuth.authenticate({
    reason: "Login to ROYAL BROILER",
    cancelTitle: "Cancel",
    androidTitle: "Login with Biometric",
    androidSubtitle: "Confirm your identity",
    allowDeviceCredential: false,
    
  });
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  if (!value) throw new Error("No stored session — please sign in with password first");
  const tokens = JSON.parse(value) as { access_token: string; refresh_token: string };
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error || !data.session) {
    // refresh token likely expired; disable
    await disableBiometric();
    throw new Error("Session expired — please sign in with password");
  }
  // Persist rotated tokens
  await Preferences.set({
    key: TOKEN_KEY,
    value: JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }),
  });
}

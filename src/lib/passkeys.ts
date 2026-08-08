import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

export const passkeysSupported = () =>
  typeof window !== "undefined" && Boolean(window.PublicKeyCredential);

/** Registers a new passkey for the currently signed-in user. */
export async function registerPasskey(deviceName?: string) {
  const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
    "passkey-register",
    { body: { step: "options" } },
  );
  if (optionsError) throw new Error(optionsError.message ?? "Could not start passkey setup");

  const attestation = await startRegistration({ optionsJSON: optionsData.options });

  const { data, error } = await supabase.functions.invoke("passkey-register", {
    body: { step: "verify", response: attestation, device_name: deviceName },
  });
  if (error) throw new Error(error.message ?? "Could not save passkey");
  if (!data?.success) throw new Error(data?.error ?? "Could not save passkey");
  return true;
}

/** Signs the user in with a passkey and establishes a session. */
export async function signInWithPasskey() {
  const { data: optionsData, error: optionsError } = await supabase.functions.invoke(
    "passkey-authenticate",
    { body: { step: "options" } },
  );
  if (optionsError) throw new Error(optionsError.message ?? "Could not start passkey sign-in");

  const assertion = await startAuthentication({ optionsJSON: optionsData.options });

  const { data, error } = await supabase.functions.invoke("passkey-authenticate", {
    body: { step: "verify", response: assertion },
  });
  if (error) throw new Error(error.message ?? "Passkey sign-in failed");
  if (!data?.token_hash) throw new Error(data?.error ?? "Passkey sign-in failed");

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: data.token_hash,
  });
  if (verifyError) throw verifyError;
  return true;
}

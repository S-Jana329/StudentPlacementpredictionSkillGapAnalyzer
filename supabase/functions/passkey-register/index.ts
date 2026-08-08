import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@13.1.1";

const BodySchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("options") }),
  z.object({
    step: z.literal("verify"),
    device_name: z.string().trim().max(80).optional(),
    response: z.record(z.unknown()),
  }),
]);

const json = { headers: { ...corsHeaders, "Content-Type": "application/json" } };

function rpFromRequest(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  let rpID = "localhost";
  try {
    rpID = new URL(origin).hostname;
  } catch {
    // keep default
  }
  return { origin, rpID };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { ...json, status: 401 });
  }
  const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  const user = userData.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { ...json, status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { ...json, status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { ...json, status: 400 });
  }

  const { origin, rpID } = rpFromRequest(req);

  if (parsed.data.step === "options") {
    const { data: existing } = await admin
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    const options = await generateRegistrationOptions({
      rpName: "Student Placement Prediction",
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email ?? user.id,
      userDisplayName: user.email ?? "Student",
      attestationType: "none",
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? []) as AuthenticatorTransport[],
      })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });

    await admin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      user_id: user.id,
      purpose: "registration",
    });

    return new Response(JSON.stringify({ options }), json);
  }

  // verify
  const response = parsed.data.response as Record<string, unknown>;
  const clientDataJSON = (response.response as Record<string, string> | undefined)?.clientDataJSON;
  if (!clientDataJSON) {
    return new Response(JSON.stringify({ error: "Malformed response" }), { ...json, status: 400 });
  }
  const clientData = JSON.parse(new TextDecoder().decode(base64urlToBytes(clientDataJSON)));
  const expectedChallenge = clientData.challenge as string;

  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("id, user_id, expires_at")
    .eq("challenge", expectedChallenge)
    .eq("purpose", "registration")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "Challenge expired. Try again." }), { ...json, status: 400 });
  }
  await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      // deno-lint-ignore no-explicit-any
      response: response as any,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("Passkey registration failed", (err as Error).message);
    return new Response(JSON.stringify({ error: "Could not verify passkey" }), { ...json, status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return new Response(JSON.stringify({ error: "Passkey verification failed" }), { ...json, status: 400 });
  }

  const cred = verification.registrationInfo.credential;
  const { error } = await admin.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: cred.id,
    public_key: bytesToBase64url(cred.publicKey),
    counter: cred.counter,
    transports: cred.transports ?? [],
    device_name: parsed.data.device_name || "Passkey",
  });

  if (error) {
    console.error("Could not store passkey", error.message);
    const status = error.code === "23505" ? 409 : 500;
    return new Response(
      JSON.stringify({ error: status === 409 ? "This passkey is already registered" : "Could not save passkey" }),
      { ...json, status },
    );
  }

  return new Response(JSON.stringify({ success: true }), json);
});

function base64urlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

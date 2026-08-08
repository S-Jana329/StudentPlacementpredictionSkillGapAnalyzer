import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@13.1.1";

const BodySchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("options") }),
  z.object({ step: z.literal("verify"), response: z.record(z.unknown()) }),
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
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: [],
    });
    await admin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      purpose: "authentication",
    });
    return new Response(JSON.stringify({ options }), json);
  }

  const response = parsed.data.response as Record<string, unknown>;
  const credentialId = typeof response.id === "string" ? response.id : null;
  const clientDataJSON = (response.response as Record<string, string> | undefined)?.clientDataJSON;
  if (!credentialId || !clientDataJSON) {
    return new Response(JSON.stringify({ error: "Malformed response" }), { ...json, status: 400 });
  }

  const clientData = JSON.parse(new TextDecoder().decode(base64urlToBytes(clientDataJSON)));
  const expectedChallenge = clientData.challenge as string;

  const { data: challengeRow } = await admin
    .from("webauthn_challenges")
    .select("id, expires_at")
    .eq("challenge", expectedChallenge)
    .eq("purpose", "authentication")
    .maybeSingle();

  if (!challengeRow || new Date(challengeRow.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "Challenge expired. Try again." }), { ...json, status: 400 });
  }
  await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

  const { data: passkey } = await admin
    .from("user_passkeys")
    .select("id, user_id, credential_id, public_key, counter, transports")
    .eq("credential_id", credentialId)
    .maybeSingle();

  if (!passkey) {
    return new Response(JSON.stringify({ error: "Unknown passkey" }), { ...json, status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      // deno-lint-ignore no-explicit-any
      response: response as any,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credential_id,
        publicKey: base64urlToBytes(passkey.public_key),
        counter: Number(passkey.counter ?? 0),
        transports: (passkey.transports ?? []) as AuthenticatorTransport[],
      },
    });
  } catch (err) {
    console.error("Passkey authentication failed", (err as Error).message);
    return new Response(JSON.stringify({ error: "Passkey verification failed" }), { ...json, status: 401 });
  }

  if (!verification.verified) {
    return new Response(JSON.stringify({ error: "Passkey verification failed" }), { ...json, status: 401 });
  }

  await admin
    .from("user_passkeys")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", passkey.id);

  const { data: userRes } = await admin.auth.admin.getUserById(passkey.user_id);
  const email = userRes.user?.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "Account cannot sign in with a passkey" }), { ...json, status: 400 });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !link?.properties?.hashed_token) {
    console.error("Could not mint session", linkError?.message);
    return new Response(JSON.stringify({ error: "Could not start session" }), { ...json, status: 500 });
  }

  return new Response(
    JSON.stringify({ success: true, email, token_hash: link.properties.hashed_token }),
    json,
  );
});

function base64urlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

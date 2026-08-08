import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passkeysSupported, registerPasskey } from "@/lib/passkeys";
import { toast } from "sonner";

type Passkey = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

const PasskeySettings = () => {
  const { user } = useAuth();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supported = passkeysSupported();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_passkeys")
      .select("id, device_name, created_at, last_used_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load your passkeys");
    setPasskeys(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const add = async () => {
    setSaving(true);
    try {
      await registerPasskey(deviceName.trim() || undefined);
      toast.success("Passkey added");
      setDeviceName("");
      await load();
    } catch (err: unknown) {
      const message = (err as Error)?.message ?? "Could not add passkey";
      if (!/NotAllowed|abort/i.test(message)) toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_passkeys").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove passkey");
      return;
    }
    toast.success("Passkey removed");
    void load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl p-4 md:p-8 space-y-6">
        <header>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Passkeys</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Sign in with your fingerprint, face, or device PIN instead of a password.
          </p>
        </header>

        <section className="section-card space-y-4">
          <h2 className="font-display text-lg font-semibold">Add a passkey</h2>
          {!supported ? (
            <p className="text-sm text-muted-foreground">
              This browser does not support passkeys. Try a recent version of Chrome, Safari, or Edge.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="device-name">Device name (optional)</Label>
                <Input
                  id="device-name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="MacBook Touch ID"
                  maxLength={80}
                />
              </div>
              <Button onClick={add} disabled={saving} className="sm:w-auto">
                <KeyRound aria-hidden="true" className="mr-2 h-4 w-4" />
                {saving ? "Waiting for device..." : "Add passkey"}
              </Button>
            </div>
          )}
        </section>

        <section className="section-card space-y-3">
          <h2 className="font-display text-lg font-semibold">Your passkeys</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No passkeys yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {passkeys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{key.device_name ?? "Passkey"}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at
                        ? ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                        : " · Never used"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(key.id)}
                    aria-label={`Remove ${key.device_name ?? "passkey"}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default PasskeySettings;

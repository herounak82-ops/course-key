import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const passwordSchema = z.string().min(6, "At least 6 characters").max(72);

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session in the URL hash; the client picks it up automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check current session in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pv = passwordSchema.safeParse(password);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pv.data });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-hero text-primary-foreground grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center animate-fade-in">
          <img src={logo} alt="Dev Study Point" className="h-20 w-20 bg-white rounded-2xl p-2 shadow-elevated" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">Reset Password</h1>
          <p className="text-sm opacity-90">Set a new password for your account</p>
        </div>
        <Card className="border-0 shadow-elevated glass-light animate-scale-in">
          <CardHeader className="pb-2" />
          <CardContent className="pt-4">
            {!ready ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying reset link…
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rp-pw">New Password</Label>
                  <Input id="rp-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-[11px] text-muted-foreground mt-1">Minimum 6 characters.</p>
                </div>
                <div>
                  <Label htmlFor="rp-pw2">Confirm Password</Label>
                  <Input id="rp-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-cta hover:opacity-95 shadow-cta border-0 tap-scale" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs opacity-80 mt-6">
          <Link to="/auth" className="underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

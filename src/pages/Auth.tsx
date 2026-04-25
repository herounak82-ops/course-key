import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import logo from "@/assets/logo.png";
import { Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Name too short").max(80);

export default function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string })?.from || "/";
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [prefilledEmail, setPrefilledEmail] = useState("");

  useEffect(() => {
    if (!loading && user) nav(from, { replace: true });
  }, [user, loading, from, nav]);

  const switchToLogin = (email: string) => {
    setPrefilledEmail(email);
    setTab("login");
  };

  return (
    <div className="min-h-screen bg-hero text-primary-foreground grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center animate-fade-in">
          <img src={logo} alt="Dev Study Point" className="h-20 w-20 bg-white rounded-2xl p-2 shadow-elevated" />
          <h1 className="mt-3 font-display text-2xl font-extrabold">Dev Study Point</h1>
          <p className="text-sm opacity-90">Learn with Dayaram (Dev) Sharma</p>
        </div>
        <Card className="border-0 shadow-elevated glass-light animate-scale-in">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <CardHeader className="pb-2">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="login">
                <LoginForm prefilledEmail={prefilledEmail} />
              </TabsContent>
              <TabsContent value="signup">
                <SignupForm onExistingEmail={switchToLogin} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs opacity-80 mt-6">
          <Link to="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}

function LoginForm({ prefilledEmail }: { prefilledEmail?: string }) {
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  };

  const onForgotPassword = async () => {
    const ev = emailSchema.safeParse(email);
    if (!ev.success) return toast.error("Enter your email above first");
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(ev.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent. Check your email.");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="li-email">Email</Label>
        <Input id="li-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="li-pw">Password</Label>
        <Input id="li-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={resetting}
          className="mt-1 text-xs text-primary hover:underline disabled:opacity-50 inline-flex items-center"
        >
          {resetting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Forgot password?
        </button>
      </div>
      <Button type="submit" className="w-full tap-scale" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Login
      </Button>
    </form>
  );
}

function SignupForm({ onExistingEmail }: { onExistingEmail: (email: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nv = nameSchema.safeParse(name);
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!nv.success) return toast.error(nv.error.issues[0].message);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: ev.data,
      password: pv.data,
      options: { emailRedirectTo: redirectUrl, data: { full_name: nv.data } },
    });
    setBusy(false);

    // Detect duplicate-email signups (Supabase returns success with empty identities[] when email exists)
    const looksLikeDuplicate =
      (error && /already|registered|exists/i.test(error.message)) ||
      (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

    if (looksLikeDuplicate) {
      toast.error("Email Already Signed Up, please Login instead");
      onExistingEmail(ev.data);
      return;
    }

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email to confirm your account.");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="su-name">Full Name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="su-pw">Password</Label>
        <Input id="su-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-[11px] text-muted-foreground mt-1">Minimum 6 characters.</p>
      </div>
      <Button type="submit" className="w-full bg-cta hover:opacity-95 shadow-cta border-0 tap-scale" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Account
      </Button>
    </form>
  );
}

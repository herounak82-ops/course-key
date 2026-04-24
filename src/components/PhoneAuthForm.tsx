import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Smartphone, ArrowLeft } from "lucide-react";

const normalizePhone = (raw: string) => {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  // Assume India if 10-digit
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  return trimmed.startsWith("91") ? `+${trimmed}` : `+${trimmed}`;
};

export function PhoneAuthForm() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [normalized, setNormalized] = useState("");
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ph = normalizePhone(phone);
    if (!/^\+\d{10,15}$/.test(ph)) {
      return toast.error("Enter a valid phone number");
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: ph });
    setBusy(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("provider") || msg.includes("not enabled") || msg.includes("sms")) {
        return toast.error(
          "Phone login isn't activated yet. Admin needs to enable an SMS provider in the backend."
        );
      }
      return toast.error(error.message);
    }
    setNormalized(ph);
    setStep("otp");
    toast.success(`OTP sent to ${ph}`);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return toast.error("Enter the 6-digit OTP");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: "sms",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Logged in!");
  };

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setOtp("");
          }}
          className="text-xs text-muted-foreground inline-flex items-center hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Change number
        </button>
        <div>
          <Label htmlFor="otp">Enter 6-digit OTP</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="tracking-[0.5em] text-center text-lg font-mono"
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Sent to <span className="font-mono">{normalized}</span>
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Verify & Login
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      <div>
        <Label htmlFor="ph-num" className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" /> Phone number
        </Label>
        <Input
          id="ph-num"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="9876543210 or +91 9876543210"
          required
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Indian numbers auto-prefixed with +91. Use full E.164 for others.
        </p>
      </div>
      <Button type="submit" className="w-full bg-cta hover:opacity-95 shadow-cta border-0" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send OTP
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        We'll text you a 6-digit code. SMS rates may apply.
      </p>
    </form>
  );
}

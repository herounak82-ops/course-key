import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const utrSchema = z.string().trim().regex(/^[a-zA-Z0-9]{8,30}$/, "Enter a valid UTR / transaction ID");
const nameSchema = z.string().trim().min(2, "Enter the name used for payment").max(80);

export function UtrSubmitForm({ courseId, onDone, idPrefix }: { courseId: string; onDone: () => void; idPrefix: string }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [utr, setUtr] = useState("");
  const [utr2, setUtr2] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in first");
    const n = nameSchema.safeParse(name);
    if (!n.success) return toast.error(n.error.issues[0].message);
    const v = utrSchema.safeParse(utr);
    if (!v.success) return toast.error(v.error.issues[0].message);
    if (v.data !== utr2.trim()) return toast.error("Transaction IDs don't match");
    if (!ok) return toast.error("Please confirm your details are correct");
    if (!window.confirm(`Please double-check:\n\nName: ${n.data}\nUTR: ${v.data}\n\nIs this correct?`)) return;
    setBusy(true);
    const { error } = await supabase.from("user_access").insert({
      user_id: user.id, course_id: courseId, transaction_id: v.data, payer_name: n.data, status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "You've already submitted for this course." : error.message);
      return;
    }
    toast.success("Submitted! We'll confirm your payment soon.");
    onDone();
  };

  return (
    <form onSubmit={submit} className="w-full space-y-2">
      <Label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">Name (as on payment)</Label>
      <Input id={`${idPrefix}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
      <Label htmlFor={`${idPrefix}-utr`} className="text-sm font-medium">UTR / Transaction ID</Label>
      <Input id={`${idPrefix}-utr`} value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" autoComplete="off" required />
      <Label htmlFor={`${idPrefix}-utr2`} className="text-sm font-medium">Confirm UTR / Transaction ID</Label>
      <Input id={`${idPrefix}-utr2`} value={utr2} onChange={(e) => setUtr2(e.target.value)} placeholder="Re-enter to confirm" autoComplete="off" onPaste={(e) => e.preventDefault()} required />
      <label className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
        <Checkbox checked={ok} onCheckedChange={(v) => setOk(!!v)} className="mt-0.5" />
        I confirm the name and UPI transaction details above are correct.
      </label>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Submit for verification
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">Your course will appear in "My Learning" once verified.</p>
    </form>
  );
}

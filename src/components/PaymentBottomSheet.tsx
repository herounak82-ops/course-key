import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, IndianRupee, Loader2, QrCode } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const utrSchema = z.string().trim().regex(/^[a-zA-Z0-9]{8,30}$/, "Enter a valid UTR / transaction ID");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upiLink: string;
  amount: number;
  courseId: string;
  onShowQrFallback: () => void;
  onSubmitted: () => void;
}

export function PaymentBottomSheet({
  open,
  onOpenChange,
  upiLink,
  amount,
  courseId,
  onShowQrFallback,
  onSubmitted,
}: Props) {
  const { user } = useAuth();
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);

  const submitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in first");
    const v = utrSchema.safeParse(utr);
    if (!v.success) return toast.error(v.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("user_access").insert({
      user_id: user.id,
      course_id: courseId,
      transaction_id: v.data,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("You've already submitted for this course.");
      else toast.error(error.message);
      return;
    }
    toast.success("Submitted! You'll be notified once verified.");
    setUtr("");
    onSubmitted();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="glass-light">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="font-display text-xl">Complete Your Payment</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 flex flex-col items-center gap-4 max-h-[80vh] overflow-y-auto">
          <div className="h-16 w-16 rounded-full bg-cta grid place-items-center shadow-cta">
            <Smartphone className="h-8 w-8 text-white" />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">Amount to pay</p>
            <p className="font-display font-extrabold text-2xl text-primary inline-flex items-center">
              <IndianRupee className="h-6 w-6" />
              {amount.toLocaleString("en-IN")}
            </p>
          </div>

          {/* Step 1 — Open UPI app */}
          <div className="w-full space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-center">
              Step 1 — Pay with UPI
            </p>
            <Button
              asChild
              className="w-full bg-cta hover:opacity-95 shadow-cta border-0 h-12 text-base font-semibold"
              size="lg"
            >
              <a href={upiLink}>Open UPI App</a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onShowQrFallback();
              }}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Show QR Code instead
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Tapping "Open UPI App" launches PhonePe / GPay / Paytm with the amount pre-filled.
            </p>
          </div>

          {/* Step 2 — Submit UTR (always visible) */}
          <form onSubmit={submitUtr} className="w-full space-y-2 pt-3 border-t">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-center">
              Step 2 — Submit Transaction ID
            </p>
            <Label htmlFor="utr-sheet" className="text-sm font-medium">
              UTR / Transaction ID
            </Label>
            <Input
              id="utr-sheet"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 412345678901"
              autoComplete="off"
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for verification
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Your course will appear in "My Learning" once verified.
            </p>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, IndianRupee, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { UtrSubmitForm } from "@/components/UtrSubmitForm";

const utrSchema = z.string().trim().regex(/^[a-zA-Z0-9]{8,30}$/, "Enter a valid UTR / transaction ID");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upiLink: string;
  upiId: string;
  payeeName: string;
  amount: number;
  courseId: string;
  onSubmitted: () => void;
}

export function QrPaymentModal({
  open,
  onOpenChange,
  upiLink,
  upiId,
  payeeName,
  amount,
  courseId,
  onSubmitted,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(upiLink, { width: 320, margin: 1, color: { dark: "#0d2a6b", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [open, upiLink]);

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card">
        {/* Darkened backdrop is handled by Dialog overlay */}
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-display text-xl">Scan & Pay</DialogTitle>
        </DialogHeader>
        <div className="px-5 pb-5 space-y-4">
          <div className="bg-white border-2 border-primary/15 rounded-2xl p-4 mx-auto w-fit shadow-elevated">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="UPI QR Code" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 grid place-items-center text-muted-foreground">
                <Loader2 className="animate-spin h-6 w-6" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">UPI ID</p>
              <button
                type="button"
                onClick={() => copy(upiId, "UPI ID")}
                className="font-mono font-semibold text-primary inline-flex items-center gap-1 hover:underline text-xs"
              >
                {upiId} <Copy className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</p>
              <p className="font-display font-extrabold text-primary inline-flex items-center">
                <IndianRupee className="h-4 w-4" />
                {amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Payee</p>
              <p className="font-semibold">{payeeName}</p>
            </div>
          </div>

          <Button asChild className="w-full bg-cta hover:opacity-95 shadow-cta border-0">
            <a href={upiLink}>Open UPI App</a>
          </Button>

          <div className="pt-3 border-t">
            <UtrSubmitForm idPrefix="modal" courseId={courseId} onDone={() => { onSubmitted(); onOpenChange(false); }} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

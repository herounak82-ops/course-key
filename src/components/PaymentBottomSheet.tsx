import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Smartphone, IndianRupee } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upiLink: string;
  amount: number;
  onShowQrFallback: () => void;
}

export function PaymentBottomSheet({ open, onOpenChange, upiLink, amount, onShowQrFallback }: Props) {
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (!open) {
      setRedirected(false);
      return;
    }
    // Trigger UPI deep link after the sheet's slide-up animation finishes (~700ms)
    const t = setTimeout(() => {
      window.location.href = upiLink;
      setRedirected(true);
    }, 800);
    return () => clearTimeout(t);
  }, [open, upiLink]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="glass-light">
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-display text-xl">
            {redirected ? "Opening your UPI app…" : "Redirecting to Payment App…"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 flex flex-col items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-cta grid place-items-center shadow-cta animate-pulse-glow">
            <Smartphone className="h-10 w-10 text-white" />
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse-dot"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-display font-extrabold text-2xl text-primary inline-flex items-center">
              <IndianRupee className="h-6 w-6" />
              {amount.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="w-full space-y-2">
            <Button asChild className="w-full bg-cta hover:opacity-95 shadow-cta border-0" size="lg">
              <a href={upiLink}>Open UPI App again</a>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                onShowQrFallback();
              }}
            >
              Show QR Code instead
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center max-w-xs">
            If your UPI app didn't open, tap "Show QR Code" to scan & pay manually.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

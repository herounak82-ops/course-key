import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  IndianRupee,
  Tag,
  Check,
  ShieldCheck,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { PaymentBottomSheet } from "@/components/PaymentBottomSheet";
import { QrPaymentModal } from "@/components/QrPaymentModal";

interface AppliedCoupon {
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
}

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("upi_id, upi_payee_name")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: access } = useQuery({
    queryKey: ["access", id, user?.id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container px-4 py-6">
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="container px-4 py-10 text-center">
          <p className="text-muted-foreground">Course not found.</p>
          <Button asChild variant="link">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // If user already has access (active or pending), bounce them to detail page
  if (access) {
    return (
      <AppLayout>
        <div className="container px-4 py-10 text-center max-w-md mx-auto">
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-3">
              <ShieldCheck className="h-10 w-10 mx-auto text-success" />
              <p className="font-semibold">
                {access.status === "active"
                  ? "You already have access to this course."
                  : "Your enrollment is awaiting verification."}
              </p>
              <Button onClick={() => nav(`/courses/${id}`)} className="w-full">
                View Course
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const basePrice = Number(course.price);
  const discount = applied
    ? applied.discount_percent
      ? Math.round((basePrice * applied.discount_percent) / 100)
      : Math.min(applied.discount_amount || 0, basePrice)
    : 0;
  const finalPrice = Math.max(basePrice - discount, 1);

  const upiId = settings?.upi_id ?? "devpanday19932@axl";
  const payeeName = "DevStudyPoint";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${finalPrice}&cu=INR&tn=${encodeURIComponent("DSP-" + course.title.slice(0, 25))}`;

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setValidating(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("code, discount_percent, discount_amount, active, expires_at")
      .eq("code", code)
      .maybeSingle();
    setValidating(false);
    if (error || !data) return toast.error("Invalid coupon code");
    if (!data.active) return toast.error("This coupon is no longer active");
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return toast.error("This coupon has expired");
    }
    setApplied({
      code: data.code,
      discount_percent: data.discount_percent,
      discount_amount: data.discount_amount,
    });
    toast.success(`Coupon "${data.code}" applied!`);
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponInput("");
  };

  return (
    <AppLayout>
      <div className="container px-4 py-4 max-w-2xl mx-auto">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to={`/courses/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to course
          </Link>
        </Button>

        <div className="text-center mb-5">
          <h1 className="font-display text-2xl md:text-3xl font-extrabold">Payment Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and complete your enrollment</p>
        </div>

        {/* Course summary */}
        <Card className="shadow-card overflow-hidden mb-4">
          <CardContent className="p-4 flex gap-3 items-center">
            <div className="h-20 w-28 rounded-lg overflow-hidden bg-secondary shrink-0">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-hero" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {course.category && (
                <Badge variant="secondary" className="text-[10px] mb-1">
                  {course.category}
                </Badge>
              )}
              <p className="font-display font-bold text-base line-clamp-2">{course.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">By Dayaram (Dev) Sharma</p>
            </div>
          </CardContent>
        </Card>

        {/* Coupon */}
        <Card className="shadow-card mb-4">
          <CardContent className="p-4">
            <Label className="flex items-center gap-1.5 mb-2">
              <Tag className="h-4 w-4 text-accent" /> Coupon Code
            </Label>
            {applied ? (
              <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg px-3 py-2.5 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <div>
                    <p className="font-mono font-bold text-success text-sm">{applied.code}</p>
                    <p className="text-[11px] text-muted-foreground">
                      You saved ₹{discount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeCoupon}>
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="font-mono uppercase"
                />
                <Button onClick={applyCoupon} disabled={validating || !couponInput.trim()}>
                  Apply
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price breakdown */}
        <Card className="shadow-card mb-4">
          <CardContent className="p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Course Price</span>
              <span className="inline-flex items-center font-medium">
                <IndianRupee className="h-3.5 w-3.5" />
                {basePrice.toLocaleString("en-IN")}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-success animate-fade-in">
                <span>Discount ({applied?.code})</span>
                <span className="inline-flex items-center font-medium">
                  − <IndianRupee className="h-3.5 w-3.5 ml-0.5" />
                  {discount.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="border-t pt-2.5 flex justify-between items-center">
              <span className="font-display font-bold">Total Payable</span>
              <span className="font-display font-extrabold text-xl text-primary inline-flex items-center">
                <IndianRupee className="h-5 w-5" />
                {finalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 mb-5 flex gap-2.5 items-start">
          <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80">
            After payment, enter your UTR / Transaction ID below. Your access will be unlocked shortly after verification.
          </p>
        </div>

        <Button
          size="lg"
          className="w-full bg-cta hover:opacity-95 shadow-cta border-0 h-14 text-base font-semibold tap-scale"
          onClick={() => setSheetOpen(true)}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Continue to Payment · ₹{finalPrice.toLocaleString("en-IN")}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Secure UPI payment · Verified before unlock
        </p>
      </div>

      <PaymentBottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        upiLink={upiLink}
        amount={finalPrice}
        courseId={course.id}
        onShowQrFallback={() => setQrOpen(true)}
        onSubmitted={() => {
          qc.invalidateQueries({ queryKey: ["access", id, user?.id] });
          qc.invalidateQueries({ queryKey: ["my-access", user?.id] });
          nav(`/courses/${id}`);
        }}
      />

      <QrPaymentModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        upiLink={upiLink}
        upiId={upiId}
        payeeName={payeeName}
        amount={finalPrice}
        courseId={course.id}
        onSubmitted={() => {
          qc.invalidateQueries({ queryKey: ["access", id, user?.id] });
          qc.invalidateQueries({ queryKey: ["my-access", user?.id] });
          nav(`/courses/${id}`);
        }}
      />
    </AppLayout>
  );
}

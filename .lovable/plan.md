## Summary

Three concrete code changes plus an explainer on payment gateways. No DB changes needed.

---

## 1. Soften / remove "manual payment" wording

The phrases live in 5 places. I'll rewrite them to neutral, professional copy that doesn't frame manual verification as the headline feature.


| File                                    | Line | Current                                                                                             | New                                                                                                              |
| --------------------------------------- | ---- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/pages/Home.tsx`                    | 309  | "Trusted coaching for K-12 and competitive exams. Manual UPI verification, lifetime course access." | "Trusted coaching for K-12 and competitive exams. Pay once via UPI and learn at your own pace."                  |
| `src/pages/CourseDetail.tsx`            | 144  | "Pay once via UPI · Lifetime course access · Manual verification"                                   | "Pay once via UPI · Full course access · Secure checkout"                                                        |
| `src/pages/Checkout.tsx`                | 278  | "After payment, you'll enter your UTR. Access is granted manually by Dev Sir within a few hours."   | "After payment, enter your UTR / Transaction ID below. Your access will be unlocked shortly after verification." |
| `src/pages/Checkout.tsx`                | 292  | "Secure UPI payment · Manual verification by instructor"                                            | "Secure UPI payment · Verified before unlock"                                                                    |
| `src/components/QrPaymentModal.tsx`     | 139  | "Dev Sir will verify manually. You'll see the unlock in 'My Learning'."                             | "Once verified, your course will appear in 'My Learning'."                                                       |
| `src/components/PaymentBottomSheet.tsx` | 79   | "If your UPI app didn't open, tap 'Show QR Code' to scan & pay manually."                           | "If your UPI app didn't open, tap 'Show QR Code' to scan and pay."                                               |


---

## 2. Fix the broken UPI deep link

Looking at `Checkout.tsx` line 141–143, the link is built as:

```
upi://pay?pa=devpanday19932@axl&pn=DevStudyPoint&am=...&cu=INR&tn=DSP-...
```

There are two real problems:

1. **The UPI handle `devpanday19932@axl` looks invalid.** `@axl` is not a recognized PSP handle suffix — common valid ones are `@axl` only for select Axis flows; far more reliable handles are `@axisbank`, `@okaxis`, `@ybl`, `@paytm`, `@upi`, etc. If the VPA itself isn't resolvable, every UPI app will reject the link. **You need to confirm the exact UPI ID** that works in your own UPI app (open PhonePe/GPay → "Pay to UPI ID" → paste `devpanday19932@axl` → if it fails to resolve, the handle is wrong and we need the correct one). I'll update `app_settings.upi_id` once you give me the right value.
2. `**window.location.href = upiLink` from a setTimeout** (in `PaymentBottomSheet.tsx`) is blocked by most modern browsers because it's not inside a direct user gesture. I'll change the bottom sheet to require an explicit tap on a big "Open UPI App" button instead of auto-redirecting. This works reliably on Chrome/Safari mobile.

**Changes to `PaymentBottomSheet.tsx`:**

- Remove the `setTimeout` auto-redirect.
- Make the primary CTA a real `<a href={upiLink}>` button styled prominently — tapping it opens the user's UPI app from a genuine gesture.
- Keep "Show QR Code instead" as secondary.

---

## 3. Always-visible UTR / Transaction ID input

Currently the only way to submit a UTR is to open the QR modal. I'll lift the UTR submission form into the `PaymentBottomSheet` itself, so the flow becomes:

```
[ Open UPI App ]   ← primary
[ Show QR Code instead ]   ← secondary

— or —

After paying, enter your UTR / Transaction ID
[ input field ]
[ Submit for verification ]
```

I'll extract the submit logic (currently in `QrPaymentModal.tsx` lines 47–72) into a small shared hook or duplicate it inline in the bottom sheet — both modal and sheet will be able to submit. The `QrPaymentModal` keeps its own UTR field too (it's still useful when the sheet is dismissed in favor of the QR view).

The `useEffect` redirect in `PaymentBottomSheet` will be removed entirely — the sheet now stays open showing the amount, the "Open UPI App" button, the "Show QR" fallback, and the UTR submission form.

---

## 4. Payment gateway — UPI-only options

**Short answer: yes, you can use a real payment gateway and restrict it to UPI only.** Manual UTR verification can be retired entirely.

For the Indian market, the two best options are:

### Option A — Razorpay (most popular for UPI in India)

- Supports UPI Collect, UPI Intent (deep link), UPI QR, and UPI AutoPay
- You can configure checkout to **show only UPI** as a payment method
- Settles directly to your bank account, auto-reconciliation, no manual UTR step
- Pricing: ~2% per UPI transaction (sometimes lower with negotiation; UPI is often free/discounted under 0.4% for many merchants)
- **What you'd need to provide:** Razorpay account (free signup at razorpay.com), business verification (PAN, bank account, GSTIN if applicable), then `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the Razorpay dashboard.

### Option B — Cashfree

- Similar to Razorpay, very strong UPI support, often slightly cheaper rates
- Same restriction: can be configured for UPI only
- **What you'd need:** Cashfree account, KYC, then `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`.

### What Lovable's built-in payment tools do NOT cover

The built-in `enable_stripe_payments` / `enable_paddle_payments` integrations **do not support UPI as a payment method in India** in a useful way (Stripe India is restricted, Paddle doesn't process UPI). So this would be a **custom integration** — I'd build it via:

1. An edge function to create the order (calls Razorpay/Cashfree API with your secret key)
2. A frontend that opens the gateway's checkout (UPI-only mode)
3. A webhook edge function to receive payment confirmation and auto-grant `user_access` (status = active)

### What I need from you to build it

1. **Choice of gateway** — Razorpay or Cashfree (Razorpay is more battle-tested; Cashfree is cheaper).
2. **A registered account on the chosen gateway** (KYC complete, in test mode at minimum).
3. **The API key + secret** from the gateway dashboard — I'll add them via Lovable's secret manager so they never touch the codebase.
4. Confirmation that you want UPI-only (vs UPI + cards + netbanking).

If you want, this can be a separate follow-up plan — for now, this plan only covers the copy fix, UPI link fix, and always-visible UTR field.

---

## Files I'll edit

- `src/pages/Home.tsx` — copy
- `src/pages/CourseDetail.tsx` — copy
- `src/pages/Checkout.tsx` — copy (2 lines)
- `src/components/QrPaymentModal.tsx` — copy
- `src/components/PaymentBottomSheet.tsx` — remove auto-redirect, add always-visible UTR submission form, soften copy

## Out of scope for this plan

- Replacing `app_settings.upi_id` with a working VPA (need you to confirm the correct one)
- Building the Razorpay/Cashfree integration (separate plan once you decide)
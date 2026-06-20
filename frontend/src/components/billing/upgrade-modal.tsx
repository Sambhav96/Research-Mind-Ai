"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BILLING_PLANS } from "@/lib/billing/plans";
import type { BillingPlanId, PaymentFormData } from "@/types/billing";
import { Check, Loader2, CreditCard, CheckCircle2 } from "lucide-react";

type Step = 1 | 2 | 3 | "processing" | "success";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId: BillingPlanId;
  onComplete: (planId: BillingPlanId, payment: PaymentFormData) => void;
}

const EMPTY_FORM: PaymentFormData = {
  name: "",
  email: "",
  institution: "",
  paymentMethod: "card",
  cardNumber: "",
  expiry: "",
  cvv: "",
  upiId: "",
};

export function UpgradeModal({ open, onOpenChange, currentPlanId, onComplete }: UpgradeModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId | null>(null);
  const [form, setForm] = useState<PaymentFormData>(EMPTY_FORM);

  const reset = () => {
    setStep(1);
    setSelectedPlan(null);
    setForm(EMPTY_FORM);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmitPayment = () => {
    if (!selectedPlan) return;
    setStep("processing");
    setTimeout(() => {
      setStep("success");
      onComplete(selectedPlan, form);
    }, 3000);
  };

  const formatCard = (value: string) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const isFormValid =
    form.name.trim() &&
    form.email.includes("@") &&
    (form.paymentMethod === "upi"
      ? !!form.upiId?.includes("@")
      : form.cardNumber.replace(/\s/g, "").length >= 15 &&
        form.expiry.length >= 5 &&
        form.cvv.length >= 3);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle>Choose a plan</DialogTitle>
                <DialogDescription>Select the plan that fits your research needs</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-1">
                {BILLING_PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-colors",
                      selectedPlan === plan.id
                        ? "border-primary bg-primary/5 shadow-[var(--glow-primary)]"
                        : "border-border/50 hover:border-primary/30",
                      plan.id === currentPlanId && "opacity-60"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{plan.name}</span>
                          {plan.popular && <Badge variant="glow" className="text-xs">Popular</Badge>}
                          {plan.id === currentPlanId && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      </div>
                      <span className="font-bold tabular-nums">
                        {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                variant="glow"
                className="w-full mt-4"
                disabled={!selectedPlan || selectedPlan === currentPlanId}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader>
                <DialogTitle>Payment details</DialogTitle>
                <DialogDescription>
                  Simulated checkout — no real payment will be processed
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <Input
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  placeholder="Institution"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                />
                
                <div className="flex rounded-lg border border-border/50 p-0.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: "card" })}
                    className={cn(
                      "flex-1 text-sm rounded-md px-3 py-2 transition-colors",
                      form.paymentMethod === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: "upi" })}
                    className={cn(
                      "flex-1 text-sm rounded-md px-3 py-2 transition-colors",
                      form.paymentMethod === "upi" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    UPI
                  </button>
                </div>

                {form.paymentMethod === "card" ? (
                  <>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Card number"
                        className="pl-10"
                        value={form.cardNumber}
                        onChange={(e) => setForm({ ...form, cardNumber: formatCard(e.target.value) })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="MM/YY"
                        value={form.expiry}
                        onChange={(e) => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
                      />
                      <Input
                        placeholder="CVV"
                        type="password"
                        maxLength={4}
                        value={form.cvv}
                        onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      />
                    </div>
                  </>
                ) : (
                  <Input
                    placeholder="Enter UPI ID (e.g. name@bank)"
                    value={form.upiId || ""}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  />
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  variant="glow"
                  className="flex-1"
                  disabled={!isFormValid}
                  onClick={handleSubmitPayment}
                >
                  Pay now
                </Button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-10 gap-4"
            >
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="font-semibold text-lg">Processing Payment</p>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your subscription...</p>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-10 gap-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">Payment Successful</p>
              <p className="text-sm text-muted-foreground text-center">
                Your plan has been upgraded. A receipt has been added to your billing history.
              </p>
              <Button variant="glow" onClick={() => handleClose(false)}>
                <Check className="h-4 w-4" />
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

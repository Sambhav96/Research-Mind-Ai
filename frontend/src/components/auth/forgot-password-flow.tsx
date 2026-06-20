"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { OTPInput } from "./otp-input";
import { PasswordStrength } from "./password-strength";
import { GlowCard } from "@/components/effects/glow-card";

interface ForgotPasswordFlowProps {
  userType: "user" | "admin";
  backHref: string;
}

export function ForgotPasswordFlow({ userType, backHref }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to request OTP");
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_type: userType, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid OTP");
      setResetToken(data.reset_token);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/auth/password-reset/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          user_type: userType, 
          reset_token: resetToken, 
          new_password: newPassword 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update password");
      setSuccessMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password Updated</h1>
          <p className="text-muted-foreground">{successMessage}</p>
        </div>
        <Link
          href={backHref}
          className="flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </Link>

      <GlowCard>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRequestOtp}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
                <p className="text-muted-foreground">Enter your email address to receive a verification code.</p>
              </div>
              
              {error && <div className="p-3 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">{error}</div>}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">Email address</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border-border bg-background py-2.5 pl-10 text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Code"}
              </button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Verify Code</h1>
                <p className="text-muted-foreground">We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span></p>
              </div>

              {error && <div className="p-3 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">{error}</div>}

              <div className="space-y-4">
                <OTPInput value={otp} onChange={setOtp} disabled={loading} />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
              </button>
              <div className="text-center">
                 <button type="button" onClick={handleRequestOtp} disabled={loading} className="text-sm font-medium text-indigo-500 hover:text-indigo-400">
                   Didn't receive a code? Resend
                 </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleUpdatePassword}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Set New Password</h1>
                <p className="text-muted-foreground">Please enter your new strong password.</p>
              </div>

              {error && <div className="p-3 text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">{error}</div>}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-lg border-border bg-background px-3 py-2.5 text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border transition-colors"
                  />
                  <PasswordStrength password={newPassword} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-lg border-border bg-background px-3 py-2.5 text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </GlowCard>
    </div>
  );
}

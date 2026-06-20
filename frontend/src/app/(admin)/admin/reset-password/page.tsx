"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { Shield, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("Missing reset token");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    setStatus("loading");
    try {
      const res = await adminApi.resetPassword({ token, password, confirm_password: confirmPassword });
      setStatus("success");
      setMessage(res.message);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to reset password");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="backdrop-blur-xl bg-card/60 border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
              <p className="text-muted-foreground text-sm mt-2 text-center">Enter your new admin password</p>
            </div>

            {!token ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
                Invalid or missing reset token. Please request a new link.
                <div className="mt-4">
                  <Link href="/admin/forgot-password" className="text-indigo-400 hover:text-indigo-300">
                    Go to Forgot Password
                  </Link>
                </div>
              </div>
            ) : status === "success" ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-xl text-center flex flex-col items-center"
              >
                <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-500" />
                <h3 className="text-lg font-medium text-emerald-300 mb-1">Password Reset Successful</h3>
                <p className="text-sm mb-4">{message}</p>
                <Link 
                  href="/admin/login"
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Return to Login
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {status === "error" && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                    {message}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-background/50 border border-border text-foreground rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all pr-12"
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground0 hover:text-muted-foreground p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background/50 border border-border text-foreground rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading" || !password || !confirmPassword}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

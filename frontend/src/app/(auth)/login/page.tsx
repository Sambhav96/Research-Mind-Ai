"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlowCard } from "@/components/effects/glow-card";
import { APP_NAME } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md relative z-10"
    >
      <GlowCard>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">{APP_NAME}</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to your research workspace</p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          suppressHydrationWarning
        >
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div>
            <Input placeholder="Email" type="email" suppressHydrationWarning {...register("email")} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Input placeholder="Password" type="password" suppressHydrationWarning {...register("password")} className="w-full" />
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            <div className="mt-1 flex justify-end">
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
          <Button type="submit" variant="glow" className="w-full" suppressHydrationWarning disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground text-center mt-6">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </GlowCard>
    </motion.div>
  );
}

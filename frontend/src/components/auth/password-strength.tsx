"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const rules = [
    { label: "At least 12 characters", valid: password.length >= 12 },
    { label: "Contains uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Contains a number", valid: /[0-9]/.test(password) },
    { label: "Contains a special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const strength = rules.filter((r) => r.valid).length;
  const strengthPercentage = (strength / rules.length) * 100;

  let strengthColor = "bg-rose-500";
  if (strength >= 3) strengthColor = "bg-amber-500";
  if (strength === 5) strengthColor = "bg-emerald-500";

  return (
    <div className="space-y-3 mt-2">
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", strengthColor)} 
          style={{ width: `${strengthPercentage}%` }} 
        />
      </div>
      <div className="grid grid-cols-1 gap-1 text-sm">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {rule.valid ? (
               <Check className="w-4 h-4 text-emerald-500" />
            ) : (
               <X className="w-4 h-4 text-muted-foreground/50" />
            )}
            <span className={rule.valid ? "text-foreground" : "text-muted-foreground"}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, BookOpen, Brain, Target, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: BookOpen,
    title: "What's your field?",
    options: ["Computer Science", "Biology", "Physics", "Social Sciences", "Other"],
  },
  {
    icon: Brain,
    title: "How do you research?",
    options: ["Literature review", "Experiment design", "Meta-analysis", "Mixed methods"],
  },
  {
    icon: Target,
    title: "Your primary goal?",
    options: ["Thesis / dissertation", "Coursework", "Industry R&D", "Personal learning"],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const router = useRouter();
  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg relative z-10">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-semibold">Set up your research OS</span>
        </div>
        <Progress value={progress} className="mb-8" />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlowCard>
              <current.icon className="h-8 w-8 text-primary mb-4" />
              <h2 className="text-xl font-bold mb-6">{current.title}</h2>
              <div className="space-y-2">
                {(current.options ?? []).map((opt) => (
                  <Button
                    key={opt}
                    onClick={() => setSelected({ ...selected, [step]: opt })}
                    className={cn(
                      "w-full justify-start text-left rounded-lg border px-4 py-3 text-sm transition-all",
                      selected[step] === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    {selected[step] === opt && <Check className="inline h-4 w-4 mr-2" />}
                    {opt}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <Button
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </Button>
                <Button
                  variant="glow"
                  disabled={!selected[step]}
                  onClick={() => {
                    if (step < steps.length - 1) setStep((s) => s + 1);
                    else router.push("/dashboard");
                  }}
                >
                  {step < steps.length - 1 ? "Continue" : "Launch workspace"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </GlowCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

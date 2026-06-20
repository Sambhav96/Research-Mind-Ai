"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/effects/glow-card";
import { FadeIn } from "@/components/motion/fade-in";
import { PRICING_PLANS } from "@/lib/constants";
import Link from "next/link";

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold">
            Simple, <span className="gradient-text">transparent</span> pricing
          </h2>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full glass p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${!annual ? "bg-primary text-primary-foreground" : ""}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${annual ? "bg-primary text-primary-foreground" : ""}`}
            >
              Annual (-20%)
            </button>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlowCard
                className={`h-full flex flex-col ${plan.popular ? "ring-2 ring-primary/40 shadow-[var(--glow-primary)]" : ""}`}
              >
                {plan.popular && (
                  <Badge variant="glow" className="w-fit mb-3 text-[11px]">✦ Most popular</Badge>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">
                    ${annual && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "glow" : "outline"} className="w-full" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

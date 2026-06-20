"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/motion/magnetic-button";

export function CTA() {
  return (
    <section className="py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="mx-auto max-w-4xl px-4 md:px-6"
      >
        <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-cyan-500/20" />
          <div className="absolute inset-0 mesh-bg" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-balance mb-4">
              Ready to transform your research?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of researchers using AI to read faster, remember more, and discover deeper.
            </p>
            <MagneticButton>
              <Button variant="glow" size="lg" asChild>
                <Link href="/register">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

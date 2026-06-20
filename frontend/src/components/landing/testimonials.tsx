"use client";

import { motion } from "framer-motion";
import { GlowCard } from "@/components/effects/glow-card";
import { FadeIn } from "@/components/motion/fade-in";

const testimonials = [
  {
    quote: "ResearchMind cut my literature review time in half. The semantic search is unreal.",
    author: "Dr. Sarah Chen",
    role: "Postdoc, MIT",
  },
  {
    quote: "Finally an AI tool that cites sources properly. My advisor actually approved it.",
    author: "James Okonkwo",
    role: "PhD Candidate, Stanford",
  },
  {
    quote: "The flashcard generation from PDFs alone is worth the subscription.",
    author: "Maria Santos",
    role: "Research Engineer",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Loved by <span className="gradient-text">researchers</span>
          </h2>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <GlowCard className="h-full">
                <p className="text-sm text-muted-foreground mb-4">&ldquo;{t.quote}&rdquo;</p>
                <p className="font-medium text-sm">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  MessageSquare,
  Search,
  Layers,
  BarChart3,
  Upload,
  Brain,
} from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { FadeIn } from "@/components/motion/fade-in";
import { staggerContainer, fadeInUp } from "@/lib/motion";

const features = [
  {
    icon: MessageSquare,
    title: "Chat with PDFs",
    description: "RAG-powered conversations with citations from your uploaded papers.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Find concepts across your entire library — not just keywords.",
  },
  {
    icon: Layers,
    title: "Flashcards & Quizzes",
    description: "AI-generated study materials from any paper in seconds.",
  },
  {
    icon: BarChart3,
    title: "Research Analytics",
    description: "Track reading habits, study trends, and productivity insights.",
  },
  {
    icon: Upload,
    title: "Smart Upload",
    description: "Bulk ingest PDFs with automatic metadata extraction.",
  },
  {
    icon: Brain,
    title: "AI Summaries",
    description: "Structured summaries with key findings and methodology.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-balance">
            Everything you need to{" "}
            <span className="gradient-text">master research</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            A complete AI research operating system — not another static dashboard.
          </p>
        </FadeIn>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f, i) => (
            <motion.div key={f.title} variants={fadeInUp} custom={i}>
              <GlowCard className="h-full">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 mb-4 ring-1 ring-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

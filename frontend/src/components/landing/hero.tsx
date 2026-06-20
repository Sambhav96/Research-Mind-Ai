"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIOrb } from "@/components/effects/ai-orb";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { APP_TAGLINE } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-7xl px-4 md:px-6 grid lg:grid-cols-2 gap-12 items-center"
      >
        <div className="space-y-8">
          <motion.div variants={fadeInUp} custom={0}>
            <Badge variant="glow" className="text-xs">
              ✦ AI Research OS — Now in public beta
            </Badge>
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            custom={1}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-[1.1]"
          >
            Think faster.{" "}
            <span className="gradient-text">Research deeper.</span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            custom={2}
            className="text-lg text-muted-foreground max-w-xl text-balance leading-relaxed"
          >
            {APP_TAGLINE}. Upload papers, chat with PDFs, semantic search, flashcards, and analytics — inside one cinematic workspace.
          </motion.p>
          <motion.div variants={fadeInUp} custom={3} className="flex flex-wrap gap-4">
            <MagneticButton>
              <Button variant="glow" size="lg" asChild aria-label="Start researching for free">
                <Link href="/register">
                  Start researching free
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <Button variant="glass" size="lg" asChild aria-label="View live demo">
              <Link href="/dashboard">
                <Play className="h-4 w-4 mr-1" />
                Live demo
              </Link>
            </Button>
          </motion.div>
          <motion.div variants={fadeInUp} custom={4} className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Trusted by researchers at</span>
            <div className="flex gap-4 opacity-60">
              {["MIT", "Stanford", "OpenAI"].map((l) => (
                <span key={l} className="font-medium">{l}</span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={fadeInUp}
          custom={2}
          className="relative flex justify-center"
        >
          <div className="relative">
            <AIOrb size={280} className="mx-auto" />
            <motion.div
              className="absolute right-0 md:-right-4 top-1/4 glass rounded-xl p-4 shadow-2xl max-w-[200px] animate-float"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs text-muted-foreground">Papers analyzed</p>
              <p className="text-2xl font-bold gradient-text">2,847</p>
            </motion.div>
            <motion.div
              className="absolute left-0 md:-left-8 bottom-1/4 glass rounded-xl p-4 shadow-2xl max-w-[180px]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-xs text-muted-foreground">AI accuracy</p>
              <p className="text-2xl font-bold text-primary">98.2%</p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

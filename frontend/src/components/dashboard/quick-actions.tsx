"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, MessageSquare, Search, Layers } from "lucide-react";

const actions = [
  { href: "/upload", icon: Upload, label: "Upload", color: "from-indigo-500/20 to-indigo-500/5" },
  { href: "/chat", icon: MessageSquare, label: "Chat", color: "from-violet-500/20 to-violet-500/5" },
  { href: "/search", icon: Search, label: "Search", color: "from-cyan-500/20 to-cyan-500/5" },
  { href: "/flashcards", icon: Layers, label: "Cards", color: "from-purple-500/20 to-purple-500/5" },
];

export const QuickActions = memo(function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action, i) => (
        <motion.div
          key={action.href}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.03 }}
        >
          <Link
            href={action.href}
            className={`flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-gradient-to-br ${action.color} p-4 hover:border-primary/30 transition-all duration-150 active:scale-[0.97]`}
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
});

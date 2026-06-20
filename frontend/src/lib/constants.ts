export const APP_NAME = "ResearchMind AI";
export const APP_TAGLINE = "The AI research operating system";
export const APP_DESCRIPTION =
  "Upload papers, chat with PDFs, semantic search, flashcards, quizzes, and research analytics — in one cinematic workspace.";

export const NAV_MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/chat", label: "AI Chat", icon: "MessageSquare" },
  { href: "/upload", label: "Upload", icon: "Upload" },
  { href: "/search", label: "Search", icon: "Search" },
  { href: "/flashcards", label: "Flashcards", icon: "Layers" },
  { href: "/quiz", label: "Quiz", icon: "Brain" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" },
  { href: "/workspaces", label: "Workspaces", icon: "FolderKanban" },
  { href: "/notes", label: "Notes", icon: "Highlighter" },
] as const;

export const NAV_SECONDARY = [
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/settings", label: "Settings", icon: "Settings" },
  { href: "/billing", label: "Billing", icon: "CreditCard" },
  { href: "/profile", label: "Profile", icon: "User" },
] as const;

export const TRUST_LOGOS = ["OpenAI", "Stanford", "MIT", "DeepMind", "Nature", "arXiv"];

export const PRICING_PLANS = [
  {
    name: "Starter",
    price: 0,
    description: "For curious researchers",
    features: ["5 papers / month", "Basic AI chat", "Semantic search", "Flashcards"],
  },
  {
    name: "Pro",
    price: 19,
    description: "For serious scholars",
    features: [
      "Unlimited papers",
      "Advanced RAG chat",
      "Quiz generation",
      "Analytics dashboard",
      "Priority AI",
    ],
    popular: true,
  },
  {
    name: "Lab",
    price: 49,
    description: "For research teams",
    features: [
      "Team workspaces",
      "Shared libraries",
      "Admin controls",
      "API access",
      "Custom models",
    ],
  },
];

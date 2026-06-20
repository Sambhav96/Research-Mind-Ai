import type { BillingPlan, BillingPlanId } from "@/types/billing";

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "month",
    description: "For curious researchers getting started",
    features: [
      "5 documents / month",
      "Basic AI chat",
      "Semantic search",
      "Flashcards & notes",
    ],
    limits: { documents: 5, aiQueries: 50, workspaces: 2, teamMembers: 1 },
  },
  {
    id: "pro",
    name: "Research Pro",
    price: 19,
    period: "month",
    description: "For serious scholars and graduate researchers",
    features: [
      "Unlimited documents",
      "Advanced RAG chat",
      "Quiz generation",
      "Analytics dashboard",
      "Priority AI processing",
    ],
    limits: { documents: null, aiQueries: 500, workspaces: 10, teamMembers: 1 },
    popular: true,
  },
  {
    id: "team",
    name: "Research Team",
    price: 49,
    period: "month",
    description: "For labs and collaborative research groups",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Shared libraries",
      "Admin controls",
      "API access",
    ],
    limits: { documents: null, aiQueries: 2000, workspaces: null, teamMembers: 10 },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    period: "month",
    description: "For institutions and large research organizations",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "Custom models",
      "SSO & compliance",
      "Dedicated support",
    ],
    limits: { documents: null, aiQueries: null, workspaces: null, teamMembers: null },
  },
];

export function getPlanById(id: BillingPlanId): BillingPlan {
  return BILLING_PLANS.find((p) => p.id === id) ?? BILLING_PLANS[0];
}

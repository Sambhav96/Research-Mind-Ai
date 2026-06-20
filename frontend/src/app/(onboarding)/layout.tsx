import { GradientMesh } from "@/components/effects/gradient-mesh";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <GradientMesh />
      {children}
    </div>
  );
}

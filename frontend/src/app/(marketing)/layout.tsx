import { GradientMesh } from "@/components/effects/gradient-mesh";
import { Particles } from "@/components/effects/particles";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <GradientMesh />
      <Particles count={30} />
      {children}
    </div>
  );
}

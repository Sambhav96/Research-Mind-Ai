import { GradientMesh } from "@/components/effects/gradient-mesh";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <GradientMesh />
      {children}
    </div>
  );
}

import "@/app/globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Admin Portal - ResearchMind AI",
  description: "Secure admin portal for ResearchMind AI",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-background text-foreground ${inter.className}`}>
      {children}
    </div>
  );
}

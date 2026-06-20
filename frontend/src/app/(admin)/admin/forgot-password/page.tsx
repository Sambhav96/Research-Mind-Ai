import { Metadata } from "next";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";

export const metadata: Metadata = {
  title: "Admin Forgot Password - ScholarMind",
  description: "Reset your ScholarMind Admin password.",
};

export default function AdminForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 shadow-lg">
        <ForgotPasswordFlow userType="admin" backHref="/admin/login" />
      </div>
    </div>
  );
}

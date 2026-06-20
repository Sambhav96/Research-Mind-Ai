import { Metadata } from "next";
import { ForgotPasswordFlow } from "@/components/auth/forgot-password-flow";

export const metadata: Metadata = {
  title: "Forgot Password - ScholarMind",
  description: "Reset your ScholarMind password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col justify-center min-h-[80vh]">
      <ForgotPasswordFlow userType="user" backHref="/login" />
    </div>
  );
}

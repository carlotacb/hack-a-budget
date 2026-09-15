import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AuthForm
      mode="register"
      googleEnabled={Boolean(
        process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
      )}
    />
  );
}

import { auth } from "@/auth";
import { HackathonRegisterForm } from "@/components/hackathon-register-form";

export default async function RegisterPage() {
  const session = await auth();

  // Anyone can register a new, fully isolated hackathon at any time. If
  // already signed in, this adds the hackathon to that existing account
  // (as its admin) instead of asking for a new profile/password.
  return <HackathonRegisterForm isAuthenticated={Boolean(session?.user)} />;
}

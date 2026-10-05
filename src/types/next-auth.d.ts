import { DefaultSession } from "next-auth";

// Role is no longer carried on the session: a single account can belong to
// several hackathons with a different role in each, so role is resolved
// per-request from the active HackathonMembership (see lib/current-hackathon.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

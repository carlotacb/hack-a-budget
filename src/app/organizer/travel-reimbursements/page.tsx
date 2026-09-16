import { Plane } from "lucide-react";
import { requireOrganizer } from "@/lib/organizer";

export default async function TravelReimbursementsPage() {
  await requireOrganizer(["ADMIN", "DIRECTOR"]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <div className="mb-8">
        <p className="eyebrow">Travel</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Travel reimbursements
        </h1>
      </div>
      <section className="dashboard-card">
        <div className="empty-state">
          <Plane size={36} />
          <h2>Reimbursement workflow coming next</h2>
          <p>
            This page is ready for the travel reimbursement flow and approval
            rules.
          </p>
        </div>
      </section>
    </main>
  );
}

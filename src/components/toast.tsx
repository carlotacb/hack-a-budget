import { CheckCircle2, XCircle } from "lucide-react";

/**
 * A message pinned to the top-right of the screen. Visibility is owned by the
 * caller (see `useAutoDismiss`), so it simply renders while mounted.
 */
export function Toast({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const isError = kind === "error";
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`toast fixed right-4 top-4 z-50 flex max-w-sm items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-medium shadow-lg ${
        isError
          ? "border-red-200 text-red-700"
          : "border-emerald-200 text-emerald-700"
      }`}
    >
      <Icon size={18} aria-hidden="true" className="shrink-0" />
      {children}
    </div>
  );
}

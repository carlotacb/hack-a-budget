type BarListItem = {
  label: string;
  value: number;
  barClass?: string;
};

type BarListProps = {
  items: BarListItem[];
  emptyMessage?: string;
};

export function BarList({
  items,
  emptyMessage = "No data yet.",
}: BarListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-700">
              {item.label}
            </span>
            <span className="shrink-0 font-semibold text-slate-900">
              {item.value}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              role="presentation"
              className={`h-2 rounded-full ${item.barClass ?? "bg-violet-500"}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

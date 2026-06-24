export function inr(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

/** Premium dashboard format — no decimals, thin space after ₹, e.g. "₹ 7,176" */
export function inrShort(value: number | string | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  if (Number.isNaN(n)) return "₹ 0";
  const sign = n < 0 ? "-" : "";
  return `₹ ${sign}${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function kg(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "0 kg";
  return `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

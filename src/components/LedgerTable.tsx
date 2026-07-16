import { inr, fmtDate } from "@/lib/format";

export type LedgerRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export function buildLedger(
  sales: Array<{ sale_date: string; total_amount: number; weight_kg: number; rate_per_kg: number; id: string }>,
  payments: Array<{ payment_date: string; amount: number; payment_mode: string; id: string }>,
  opening?: { amount: number; date?: string | null; notes?: string | null },
): LedgerRow[] {
  type E = { date: string; debit: number; credit: number; description: string; ts: number };
  const events: E[] = [];
  if (opening && Number(opening.amount) !== 0) {
    const d = opening.date || sales[0]?.sale_date || new Date().toISOString().slice(0, 10);
    events.push({
      date: d,
      debit: Number(opening.amount) > 0 ? Number(opening.amount) : 0,
      credit: Number(opening.amount) < 0 ? -Number(opening.amount) : 0,
      description: `Opening Balance${opening.notes ? ` — ${opening.notes}` : ""}`,
      ts: new Date(d).getTime() - 1, // ensure it's first
    });
  }
  for (const s of sales) {
    events.push({
      date: s.sale_date,
      debit: Number(s.total_amount),
      credit: 0,
      description: `Sale · ${Number(s.weight_kg).toFixed(2)} kg @ ${inr(s.rate_per_kg)}`,
      ts: new Date(s.sale_date).getTime(),
    });
  }
  for (const p of payments) {
    events.push({
      date: p.payment_date,
      debit: 0,
      credit: Number(p.amount),
      description: `Payment received (${p.payment_mode.toUpperCase()})`,
      ts: new Date(p.payment_date).getTime() + 1,
    });
  }
  events.sort((a, b) => a.ts - b.ts);
  let bal = 0;
  return events.map((e) => {
    bal = bal + e.debit - e.credit;
    return {
      date: fmtDate(e.date),
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      balance: bal,
    };
  });
}

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (!rows.length) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">No ledger entries yet</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-secondary-foreground">
          <tr>
            <th className="text-left font-semibold px-4 py-2.5">Date</th>
            <th className="text-left font-semibold px-4 py-2.5">Description</th>
            <th className="text-right font-semibold px-4 py-2.5">Debit</th>
            <th className="text-right font-semibold px-4 py-2.5">Credit</th>
            <th className="text-right font-semibold px-4 py-2.5">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/40">
              <td className="px-4 py-2.5 whitespace-nowrap">{r.date}</td>
              <td className="px-4 py-2.5">{r.description}</td>
              <td className="px-4 py-2.5 text-right">{r.debit ? inr(r.debit) : "—"}</td>
              <td className="px-4 py-2.5 text-right text-success">{r.credit ? inr(r.credit) : "—"}</td>
              <td className="px-4 py-2.5 text-right font-semibold">{inr(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

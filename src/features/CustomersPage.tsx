import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, ChevronRight, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { inr, fmtDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  current_balance: number;
  status: string;
  created_at: string;
  opening_balance: number;
  opening_balance_date: string | null;
  opening_balance_notes: string | null;
};

export function CustomersPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    status: "active",
    opening_balance: "",
    opening_balance_date: "",
    opening_balance_notes: "",
  });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const filtered = customers.filter((c) =>
    [c.name, c.phone, c.address].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        status: form.status,
        opening_balance: form.opening_balance ? Number(form.opening_balance) : 0,
        opening_balance_date: form.opening_balance_date || null,
        opening_balance_notes: form.opening_balance_notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated" : "Customer added");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-detail"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      address: c.address ?? "",
      status: c.status,
      opening_balance: c.opening_balance ? String(c.opening_balance) : "",
      opening_balance_date: c.opening_balance_date ?? "",
      opening_balance_notes: c.opening_balance_notes ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <UsersIcon className="size-7 text-gold" /> {t("customers")}
          </h1>
          <p className="text-sm text-muted-foreground">{customers.length} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="shadow-royal">
              <Plus className="size-4 mr-1" /> {t("addCustomer")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t("edit") : t("addCustomer")}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                upsert.mutate();
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="cname">{t("name")}</Label>
                <Input id="cname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cphone">{t("phone")}</Label>
                <Input id="cphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caddr">{t("address")}</Label>
                <Textarea id="caddr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex gap-2">
                  {["active", "inactive"].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setForm({ ...form, status: s })}
                      className={`px-3 py-1.5 rounded-md text-sm border ${
                        form.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Opening Balance {editing ? "" : "(Previous Due)"}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Admin only</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="obal" className="text-xs">Amount (₹)</Label>
                    <Input
                      id="obal"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.opening_balance}
                      onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="obdate" className="text-xs">As-of Date</Label>
                    <Input
                      id="obdate"
                      type="date"
                      value={form.opening_balance_date}
                      onChange={(e) => setForm({ ...form, opening_balance_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obnotes" className="text-xs">Notes (optional)</Label>
                  <Input
                    id="obnotes"
                    placeholder="Previous outstanding before using ROYAL BROILER"
                    value={form.opening_balance_notes}
                    onChange={(e) => setForm({ ...form, opening_balance_notes: e.target.value })}
                  />
                </div>
                {editing && Number(editing.opening_balance) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Remove the opening balance for this customer? Their outstanding will be recalculated.")) {
                        setForm({ ...form, opening_balance: "0", opening_balance_date: "", opening_balance_notes: "" });
                      }
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Remove opening balance
                  </button>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>{t("save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !filtered.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No customers</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <Link to="/customers/$id" params={{ id: c.id }} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.phone || "—"} · joined {fmtDate(c.created_at)}
                    </div>
                  </Link>
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="hidden sm:inline-flex">
                    {c.status}
                  </Badge>
                  <div className={`font-semibold w-24 text-right ${Number(c.current_balance) > 0 ? "text-destructive" : Number(c.current_balance) < 0 ? "text-success" : ""}`}>
                    {inr(c.current_balance)}
                  </div>
                  <div className="hidden sm:flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${c.name}? This also deletes all their sales & payments.`)) del.mutate(c.id);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <Link to="/customers/$id" params={{ id: c.id }} className="text-muted-foreground sm:hidden">
                    <ChevronRight className="size-5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

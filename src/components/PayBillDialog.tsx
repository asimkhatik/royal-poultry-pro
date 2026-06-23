import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Smartphone, Copy, Check } from "lucide-react";
import { inr } from "@/lib/format";
import { toast } from "sonner";

const UPI_ID = "asimkhatik1116-1@okicici";
const PAYEE_NAME = "ROYAL BROILER";

export function PayBillDialog({ balance, customerName }: { balance: number; customerName?: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "custom">("full");
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState(false);

  const amount = mode === "full" ? balance : Number(custom || 0);
  const valid = amount > 0 && Number.isFinite(amount);

  const note = customerName ? `Payment from ${customerName}` : "Bill payment";
  const upiLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    PAYEE_NAME,
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`;

  const copyUpi = async () => {
    await navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success("UPI ID copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const openApp = () => {
    if (!valid) return toast.error("Enter a valid amount");
    window.location.href = upiLink;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shadow-royal" disabled={balance <= 0}>
          <Wallet className="size-4 mr-2" /> Pay bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay your bill</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</div>
            <div className="font-display text-2xl font-bold text-destructive">{inr(balance)}</div>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "full" | "custom")} className="grid grid-cols-2 gap-2">
            <Label htmlFor="full" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="full" id="full" />
              <span className="text-sm font-medium">Full bill</span>
            </Label>
            <Label htmlFor="custom" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem value="custom" id="custom" />
              <span className="text-sm font-medium">Custom amount</span>
            </Label>
          </RadioGroup>

          {mode === "custom" && (
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <div className="text-xs text-muted-foreground">Paying to</div>
              <div className="text-sm font-medium">{UPI_ID}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={copyUpi} title="Copy UPI ID">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </Button>
          </div>

          {valid && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3">
              <img src={qrSrc} alt="UPI QR code" className="size-48 rounded-md bg-white p-2" />
              <p className="text-xs text-muted-foreground text-center">
                Scan with any UPI app — Google Pay, PhonePe, Paytm, BHIM
              </p>
              <div className="font-display text-xl font-bold">{inr(amount)}</div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            After paying, your balance updates once the admin confirms the payment.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={openApp} disabled={!valid} className="shadow-royal">
            <Smartphone className="size-4 mr-2" /> Open UPI app
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

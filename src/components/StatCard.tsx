import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { inrShort } from "@/lib/format";

export type StatTone = "revenue" | "outstanding" | "weight" | "customers" | "paid" | "neutral";

const toneText: Record<StatTone, string> = {
  revenue: "text-[oklch(0.45_0.14_150)] dark:text-[oklch(0.78_0.16_150)]",
  outstanding: "text-[oklch(0.55_0.20_25)] dark:text-[oklch(0.72_0.20_25)]",
  weight: "text-[oklch(0.42_0.16_265)] dark:text-[oklch(0.78_0.14_265)]",
  customers: "text-[oklch(0.62_0.16_75)] dark:text-[oklch(0.82_0.15_85)]",
  paid: "text-[oklch(0.45_0.14_150)] dark:text-[oklch(0.78_0.16_150)]",
  neutral: "text-foreground",
};

const toneIconBg: Record<StatTone, string> = {
  revenue: "bg-[oklch(0.45_0.14_150)]/10 text-[oklch(0.45_0.14_150)] dark:bg-[oklch(0.78_0.16_150)]/15 dark:text-[oklch(0.78_0.16_150)]",
  outstanding: "bg-[oklch(0.55_0.20_25)]/10 text-[oklch(0.55_0.20_25)] dark:bg-[oklch(0.72_0.20_25)]/15 dark:text-[oklch(0.72_0.20_25)]",
  weight: "bg-[oklch(0.42_0.16_265)]/10 text-[oklch(0.42_0.16_265)] dark:bg-[oklch(0.78_0.14_265)]/15 dark:text-[oklch(0.78_0.14_265)]",
  customers: "gold-gradient text-gold-foreground shadow-gold",
  paid: "bg-[oklch(0.45_0.14_150)]/10 text-[oklch(0.45_0.14_150)] dark:bg-[oklch(0.78_0.16_150)]/15 dark:text-[oklch(0.78_0.16_150)]",
  neutral: "bg-secondary text-secondary-foreground",
};

/** Count-up that animates only when the numeric value changes. */
function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === fromRef.current) return;
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

export type StatFormat = "currency" | "weight" | "count";

function formatStat(value: number, kind: StatFormat) {
  if (kind === "currency") return inrShort(value);
  if (kind === "weight") {
    const n = Math.round(value * 100) / 100;
    return `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;
  }
  return Math.round(value).toLocaleString("en-IN");
}

export function StatCard({
  label,
  value,
  format = "currency",
  tone = "neutral",
  icon: Icon,
  highlight,
  size = "md",
}: {
  label: string;
  value: number;
  format?: StatFormat;
  tone?: StatTone;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const animated = useCountUp(value);
  const display = formatStat(animated, format);
  const valueSize =
    size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-xl sm:text-2xl" : "text-2xl sm:text-[28px]";

  return (
    <Card className={cn("transition-shadow", highlight && "border-gold/40 shadow-gold")}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
              {label}
            </div>
            <div className={cn("mt-2 font-stat tabular-nums leading-none truncate", valueSize, toneText[tone])}>
              {display}
            </div>
          </div>
          {Icon && (
            <div className={cn("size-9 sm:size-10 rounded-xl flex items-center justify-center shrink-0", toneIconBg[tone])}>
              <Icon className="size-4 sm:size-[18px]" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

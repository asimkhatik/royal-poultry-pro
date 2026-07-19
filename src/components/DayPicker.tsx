import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DayPickerControl({
  value,
  onChange,
  className,
}: {
  value: Date;
  onChange: (d: Date) => void;
  className?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = value.toDateString() === today.toDateString();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isToday && (
        <Button size="sm" variant="ghost" onClick={() => onChange(new Date())}>
          Today
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="size-4" />
            {isToday ? "Today" : format(value, "dd MMM yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => d && onChange(d)}
            disabled={(d) => d > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

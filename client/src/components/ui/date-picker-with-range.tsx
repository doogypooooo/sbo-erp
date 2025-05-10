import * as React from "react";
import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
}

export function DatePickerWithRange({
  dateRange,
  onDateRangeChange,
  className,
  align = "start",
}: DatePickerWithRangeProps) {
  // 빠른 선택 옵션
  const handleQuickSelect = (option: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (option) {
      case "today":
        onDateRangeChange({
          from: today,
          to: today,
        });
        break;
      case "yesterday":
        const yesterday = addDays(today, -1);
        onDateRangeChange({
          from: yesterday,
          to: yesterday,
        });
        break;
      case "thisMonth":
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        onDateRangeChange({
          from: firstDayOfMonth,
          to: lastDayOfMonth,
        });
        break;
      case "lastMonth":
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        onDateRangeChange({
          from: firstDayOfLastMonth,
          to: lastDayOfLastMonth,
        });
        break;
      case "thisQuarter":
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const firstDayOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1);
        const lastDayOfQuarter = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        onDateRangeChange({
          from: firstDayOfQuarter,
          to: lastDayOfQuarter,
        });
        break;
      case "thisYear":
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
        onDateRangeChange({
          from: firstDayOfYear,
          to: lastDayOfYear,
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "yyyy-MM-dd", { locale: ko })} ~{" "}
                  {format(dateRange.to, "yyyy-MM-dd", { locale: ko })}
                </>
              ) : (
                format(dateRange.from, "yyyy-MM-dd", { locale: ko })
              )
            ) : (
              <span>기간 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="p-3 border-b">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("today")}>오늘</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("yesterday")}>어제</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("thisMonth")}>이번 달</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("lastMonth")}>지난 달</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("thisQuarter")}>이번 분기</Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect("thisYear")}>올해</Button>
            </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            locale={ko}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

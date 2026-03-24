"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

export interface DateRange {
    start: string;
    end: string;
}

interface DateRangePickerProps {
    onChange: (range: DateRange) => void;
    defaultRange?: DateRange;
}

export function DateRangePicker({ onChange, defaultRange }: DateRangePickerProps) {
    const [startDate, setStartDate] = useState(defaultRange?.start || "");
    const [endDate, setEndDate] = useState(defaultRange?.end || "");

    const getPresetDates = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        return {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
        };
    };

    const handleApply = () => {
        if (!startDate || !endDate) return;
        if (new Date(startDate) > new Date(endDate)) {
            toast.error("Start date cannot be after end date.");
            return;
        }
        onChange({ start: startDate, end: endDate });
    };

    const setPreset = (days: number) => {
        const { start, end } = getPresetDates(days);
        setStartDate(start);
        setEndDate(end);
        onChange({ start, end });
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/10 p-2 sm:p-3 rounded-xl shadow-sm border border-border/50">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground hidden lg:block ml-2" />
                <div className="flex items-center gap-2 bg-background p-1.5 rounded-lg border shadow-sm">
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs border-0 bg-transparent shadow-none"
                    />
                    <span className="text-muted-foreground text-xs font-medium">-</span>
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs border-0 bg-transparent shadow-none"
                    />
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
                <Button variant="secondary" size="sm" onClick={() => setPreset(7)} className="h-8 text-xs flex-1 sm:flex-none">7D</Button>
                <Button variant="secondary" size="sm" onClick={() => setPreset(30)} className="h-8 text-xs flex-1 sm:flex-none">30D</Button>
                <Button variant="secondary" size="sm" onClick={() => setPreset(90)} className="h-8 text-xs flex-1 sm:flex-none">90D</Button>
                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                <Button size="sm" onClick={handleApply} className="h-8 text-xs w-full sm:w-auto">Apply Range</Button>
            </div>
        </div>
    );
}

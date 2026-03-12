// src/components/kanban/ColumnSettingsDialog.tsx
import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface ColumnData {
    id: string;
    title: string;
    category?: string;
    color?: string;
    wipLimit?: number | null;
}

interface ColumnSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    column?: ColumnData | null; // If null, we are creating a new column
    onSave: (data: { title: string; category: string; color: string; wipLimit: number | null }) => void;
}

const CATEGORIES = [
    { value: "todo", label: "To Do", dot: "bg-slate-500" },
    { value: "in_progress", label: "In Progress", dot: "bg-blue-500" },
    { value: "done", label: "Done", dot: "bg-emerald-500" },
];

const COLORS = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet 
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#64748b", // Slate
];

export default function ColumnSettingsDialog({
    open,
    onOpenChange,
    column,
    onSave,
}: ColumnSettingsDialogProps) {
    const isEditing = !!column;

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("todo");
    const [color, setColor] = useState(COLORS[0]);
    const [wipLimit, setWipLimit] = useState<string>("");

    useEffect(() => {
        if (open) {
            if (column) {
                setTitle(column.title);
                setCategory(column.category || "todo");
                setColor(column.color || COLORS[0]);
                setWipLimit(column.wipLimit ? column.wipLimit.toString() : "");
            } else {
                setTitle("");
                setCategory("todo");
                setColor(COLORS[0]);
                setWipLimit("");
            }
        }
    }, [open, column]);

    const handleSave = () => {
        if (!title.trim()) return;

        const limit = wipLimit.trim() === "" ? null : parseInt(wipLimit, 10);
        
        onSave({
            title: title.trim(),
            category,
            color,
            wipLimit: limit && limit > 0 ? limit : null,
        });

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Column Settings" : "Add New Column"}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Column Name</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., In Review"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Category (Workflow Stage)</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                                            {cat.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Affects metrics and GitHub smart commits (e.g., merging a PR moves a card to a "Done" category column).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Accent Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                                        color === c 
                                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" 
                                            : "hover:scale-105 opacity-80"
                                    }`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && (
                                        <div className="w-2 h-2 rounded-full bg-white/90" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="wipLimit">WIP Limit (Work In Progress)</Label>
                        <Input
                            id="wipLimit"
                            type="number"
                            min="0"
                            value={wipLimit}
                            onChange={(e) => setWipLimit(e.target.value)}
                            placeholder="e.g., 5 (Leave empty for no limit)"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Columns exceeding this limit will be highlighted to flag bottlenecks.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!title.trim()}>
                        {isEditing ? "Save Changes" : "Create Column"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

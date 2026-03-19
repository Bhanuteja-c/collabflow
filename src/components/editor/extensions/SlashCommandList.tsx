import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { CommandItem } from "./slashCommand";

interface SlashCommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

const SlashCommandList = forwardRef((props: SlashCommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key === "ArrowUp") {
                upHandler();
                return true;
            }

            if (event.key === "ArrowDown") {
                downHandler();
                return true;
            }

            if (event.key === "Enter") {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    if (props.items.length === 0) {
        return null; // Return null to not render anything when no items mach
    }

    return (
        <div className="flex flex-col bg-popover text-popover-foreground border shadow-md rounded-lg overflow-hidden w-64 p-1 z-50">
            {props.items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => selectItem(index)}
                    className={`flex items-start gap-3 w-full text-left px-3 py-2 rounded-md transition-colors ${
                        index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground"
                    }`}
                >
                    <div className={`mt-0.5 p-1 rounded-md bg-background border ${index === selectedIndex ? "text-primary border-primary/30" : "text-muted-foreground"}`}>
                        {item.icon}
                    </div>
                    <div>
                        <div className="font-medium text-sm text-foreground">{item.title}</div>
                        <div className="text-xs opacity-80">{item.description}</div>
                    </div>
                </button>
            ))}
        </div>
    );
});

SlashCommandList.displayName = "SlashCommandList";

export default SlashCommandList;

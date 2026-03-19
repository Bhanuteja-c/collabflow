import React from "react";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import SlashCommandList from "./SlashCommandList";
import { Editor } from "@tiptap/core";

export interface CommandItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: (props: { editor: Editor; range: Range }) => void;
}

export const SlashCommand = Extension.create({
    name: "slashCommand",

    addOptions() {
        return {
            suggestion: {
                char: "/",
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

export const getSlashCommandSuggestions = (items: CommandItem[]) => ({
    items: ({ query }: { query: string }) => {
        return items
            .filter((item) => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10);
    },

    render: () => {
        let component: ReactRenderer<any> | null = null;
        let popup: TippyInstance[] | null = null;

        return {
            onStart: (props: any) => {
                component = new ReactRenderer(SlashCommandList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                popup = tippy("body", {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component.element,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "bottom-start",
                });
            },

            onUpdate(props: any) {
                component?.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                popup?.[0]?.setProps({
                    getReferenceClientRect: props.clientRect,
                });
            },

            onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === "Escape") {
                    popup?.[0]?.hide();
                    return true;
                }

                return component?.ref?.onKeyDown(props.event) || false;
            },

            onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
            },
        };
    },
});

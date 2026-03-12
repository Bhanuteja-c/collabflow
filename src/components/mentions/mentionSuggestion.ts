// src/components/mentions/mentionSuggestion.ts
// TipTap Mention extension suggestion configuration helpers
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import MentionList, { MentionListRef, MentionItem } from "./MentionList";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

type ItemsFn = (props: { query: string }) => Promise<MentionItem[]> | MentionItem[];

export function createMentionSuggestion(
  fetchItems: ItemsFn,
  type: "user" | "card" = "user"
): Omit<SuggestionOptions<MentionItem>, 'editor'> {
  return {
    items: async ({ query }) => {
      return fetchItems({ query });
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          component = new ReactRenderer(MentionList, {
            props: { ...props, type },
            editor: props.editor,
          });

          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props: SuggestionProps<MentionItem>) {
          component?.updateProps({ ...props, type });

          if (!props.clientRect) return;

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props) || false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import {
    Bold, Italic, List, ListOrdered, Heading1, Heading2, Undo, Redo,
    Quote, Code, Strikethrough, Link as LinkIcon, Image as ImageIcon,
    CheckSquare, Square
} from "lucide-react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { HistorySidebar } from "./HistorySidebar";

interface CollaborativeEditorProps {
    ydoc: Y.Doc;
    // ... existing props
    awareness: Awareness;
    initialContent: string;
    permission: "owner" | "edit" | "view";
    userName: string;
    userColor: string;
    onSave: (content: string) => void;
    saving: boolean;
    historyOpen: boolean;
    onHistoryClose: () => void;
    documentId: string;
    onContentChange?: (content: string) => void;
}

export default function CollaborativeEditor({
    ydoc,
    awareness,
    initialContent,
    permission,
    userName,
    userColor,
    onSave,
    saving,
    historyOpen,
    onHistoryClose,
    documentId,
    onContentChange,
}: CollaborativeEditorProps) {
    // ... extensions ...
    const extensions = useMemo(() => [
        // ... existing extensions
        StarterKit,
        Collaboration.configure({
            document: ydoc,
        }),
        CollaborationCursor.configure({
            provider: {
                awareness,
            } as any,
            user: {
                name: userName,
                color: userColor,
            },
        }),
        BubbleMenuExtension,
        FloatingMenuExtension,
        Link.configure({
            openOnClick: false,
            autolink: true,
        }),
        Image,
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        Placeholder.configure({
            placeholder: 'Type "/" for commands...',
        }),
    ], [ydoc, awareness, userName, userColor]);

    const editor = useEditor({
        extensions,
        content: initialContent,
        editorProps: {
            attributes: {
                class: "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
            },
        },
        immediatelyRender: false,
        editable: permission !== "view",
        onUpdate: ({ editor }) => {
            onContentChange?.(editor.getHTML());
        },
    });

    const handleRestore = useCallback(async (content: string) => {
        if (!editor) return;
        // Update editor content (which updates Ydoc via Collaboration extension)
        editor.commands.setContent(content);
        // Trigger save immediately to persist restoration
        onSave(content);
    }, [editor, onSave]);

    // ... auto-save effect ...

    // Auto-save on changes
    useEffect(() => {
        if (!editor) return;
        let timeoutId: NodeJS.Timeout;
        const handleUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => onSave(editor.getHTML()), 2000);
        };
        editor.on("update", handleUpdate);
        return () => {
            clearTimeout(timeoutId);
            editor.off("update", handleUpdate);
        };
    }, [editor, onSave]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        // cancelled
        if (url === null) return;

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addImage = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Image URL');

        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    if (!editor) {
        return (
            <div className="flex flex-col flex-1 h-full bg-secondary/30">
                {/* Skeleton Toolbar */}
                <div className="w-full bg-background/95 border-b flex justify-center py-2 px-4 z-10 h-[53px]">
                    <div className="w-[500px] h-8 bg-muted/60 rounded-md animate-pulse" />
                </div>
                {/* Skeleton Page */}
                <div className="flex-1 overflow-auto p-8 sm:py-12 sm:px-8 flex justify-center">
                    <div className="bg-background w-full max-w-[850px] min-h-[1100px] shadow-sm border rounded-sm p-12 sm:p-16 flex flex-col gap-6">
                        <div className="h-10 w-2/3 bg-muted/30 rounded-lg animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted/40 to-transparent" />
                        <div className="h-4 w-full bg-muted/20 rounded animate-[shimmer_2.5s_infinite]" />
                        <div className="h-4 w-[90%] bg-muted/20 rounded animate-[shimmer_2.5s_infinite]" />
                        <div className="h-4 w-[95%] bg-muted/20 rounded animate-[shimmer_2.5s_infinite]" />
                        <div className="h-4 w-[60%] bg-muted/20 rounded animate-[shimmer_2.5s_infinite] mb-4" />

                        <div className="h-4 w-full bg-muted/20 rounded animate-[shimmer_3s_infinite]" />
                        <div className="h-4 w-[85%] bg-muted/20 rounded animate-[shimmer_3s_infinite]" />
                        <div className="h-4 w-[70%] bg-muted/20 rounded animate-[shimmer_3s_infinite]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full bg-secondary/30">
            <HistorySidebar
                isOpen={historyOpen}
                onClose={onHistoryClose}
                documentId={documentId}
                onRestore={handleRestore}
            />
            {/* Toolbar - Fixed at top of editor container */}
            <div className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b flex justify-center py-2 px-4 z-10">
                <div className="flex items-center gap-1 p-1 bg-background rounded-lg shadow-sm border overflow-x-auto max-w-full no-scrollbar">
                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()}
                            isActive={editor.isActive("bold")} title="Bold">
                            <Bold className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()}
                            isActive={editor.isActive("italic")} title="Italic">
                            <Italic className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()}
                            isActive={editor.isActive("strike")} title="Strike">
                            <Strikethrough className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()}
                            isActive={editor.isActive("code")} title="Code">
                            <Code className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={setLink}
                            isActive={editor.isActive("link")} title="Link">
                            <LinkIcon className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
                            <Heading1 className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
                            <Heading2 className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}
                            isActive={editor.isActive("bulletList")} title="Bullet List">
                            <List className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            isActive={editor.isActive("orderedList")} title="Ordered List">
                            <ListOrdered className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()}
                            isActive={editor.isActive("taskList")} title="Tasks">
                            <CheckSquare className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            isActive={editor.isActive("blockquote")} title="Quote">
                            <Quote className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={addImage} isActive={false} title="Image">
                            <ImageIcon className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} title="Undo">
                            <Undo className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} title="Redo">
                            <Redo className="w-4 h-4" />
                        </ToolbarButton>
                    </div>
                </div>
            </div>

            {/* Bubble Menu */}
            {editor && (
                <BubbleMenu editor={editor} className="flex overflow-hidden rounded-md border border-border bg-popover shadow-md p-1 gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strike">
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Link">
                        <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>
                </BubbleMenu>
            )}

            {/* Floating Menu */}
            {editor && (
                <FloatingMenu editor={editor} className="flex overflow-hidden rounded-md border border-border bg-popover shadow-md p-1 gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="H1">
                        <Heading1 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="H2">
                        <Heading2 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="List">
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} title="Tasks">
                        <CheckSquare className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={addImage} isActive={false} title="Image">
                        <ImageIcon className="w-4 h-4" />
                    </ToolbarButton>
                </FloatingMenu>
            )}

            {/* Editor Content Area (Page View) */}
            <div className="flex-1 overflow-auto p-8 sm:py-12 sm:px-8 flex justify-center" onClick={() => editor.chain().focus().run()}>
                <div className="bg-background w-full max-w-[850px] min-h-[1100px] shadow-sm border rounded-sm p-12 sm:p-16 cursor-text transition-shadow hover:shadow-md page-container">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}

const ToolbarButton = ({ onClick, isActive, children, title }: any) => (
    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClick(); }} title={title}
        className={`h-8 w-8 p-0 ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>
        {children}
    </Button>
);

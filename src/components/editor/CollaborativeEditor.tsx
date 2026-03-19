"use client";

import React, { useEffect, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import { CollaborationCursor } from "@/components/editor/extensions/CollaborationCursor";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { SlashCommand, getSlashCommandSuggestions } from "./extensions/slashCommand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Bold, Italic, List, ListOrdered, Heading1, Heading2, Undo, Redo,
    Quote, Code, Strikethrough, Link as LinkIcon, Image as ImageIcon,
    CheckSquare, Square, AlignLeft, AlignCenter, AlignRight,
    Highlighter, Table as TableIcon, CodeSquare, Loader2, Palette, Type,
    FileText, CalendarDays, Rocket, PanelRight, X, Minus
} from "lucide-react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { HistorySidebar } from "./HistorySidebar";
import Mention from "@tiptap/extension-mention";
import { createMentionSuggestion } from "@/components/mentions/mentionSuggestion";
import type { MentionItem } from "@/components/mentions/MentionList";

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
    workspaceMembers?: { id: string; name: string | null; image?: string | null }[];
    workspaceSlug?: string;
    coverImage?: string | null;
    onUpdateCoverImage?: (url: string | null) => void;
}

const lowlight = createLowlight(all);

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
    workspaceMembers = [],
    workspaceSlug = "",
    coverImage,
    onUpdateCoverImage
}: CollaborativeEditorProps) {
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const bannerInputRef = React.useRef<HTMLInputElement>(null);
    const [outline, setOutline] = useState<{ level: number, text: string, pos: number }[]>([]);
    const [outlineOpen, setOutlineOpen] = useState(true);

    const commandItems = useMemo(() => [
        {
            title: "Heading 1",
            description: "Big section heading.",
            icon: <Heading1 className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
            },
        },
        {
            title: "Heading 2",
            description: "Medium section heading.",
            icon: <Heading2 className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
            },
        },
        {
            title: "Bullet List",
            description: "Create a simple bulleted list.",
            icon: <List className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: "Numbered List",
            description: "Create a list with numbering.",
            icon: <ListOrdered className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: "To-Do List",
            description: "Track tasks with checkboxes.",
            icon: <CheckSquare className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },
        {
            title: "Table",
            description: "Insert a 3x3 table.",
            icon: <TableIcon className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
            },
        },
        {
            title: "Code Block",
            description: "Capture a code snippet.",
            icon: <CodeSquare className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
            },
        },
        {
            title: "Quote",
            description: "Capture a quote.",
            icon: <Quote className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: "Image",
            description: "Upload an image.",
            icon: <ImageIcon className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                imageInputRef.current?.click();
            },
        },
        {
            title: "Divider",
            description: "Insert a visual divider.",
            icon: <Minus className="w-4 h-4" />,
            command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
    ], []);

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
            },
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
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        CodeBlockLowlight.configure({
            lowlight,
        }),
        Table.configure({
            resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TextStyle,
        Color,
        FontFamily.configure({
            types: ['textStyle'],
        }),
        SlashCommand.configure({
            suggestion: getSlashCommandSuggestions(commandItems),
        }),
        Placeholder.configure({
            placeholder: 'Type "/" for commands, "@" to mention, "#" to link a card...',
        }),
        Mention.configure({
            HTMLAttributes: {
                class: "mention",
                "data-type": "user",
                "data-mention-type": "user",
            },
            suggestion: createMentionSuggestion(
                ({ query }) => {
                    return workspaceMembers
                        .filter((m) => (m.name || "").toLowerCase().includes(query.toLowerCase()))
                        .slice(0, 8)
                        .map((m) => ({
                            id: m.id,
                            label: m.name || "Unknown",
                            image: m.image || undefined,
                        }));
                },
                "user"
            ),
        }),
        Mention.extend({ name: "cardMention" }).configure({
            HTMLAttributes: {
                class: "mention",
                "data-type": "card",
                "data-mention-type": "card",
            },
            suggestion: {
                char: "#",
                ...createMentionSuggestion(
                    async ({ query }) => {
                        if (!workspaceSlug || query.length < 1) return [];
                        try {
                            const res = await fetch(
                                `/api/cards/search?q=${encodeURIComponent(query)}&workspaceSlug=${encodeURIComponent(workspaceSlug)}`
                            );
                            if (!res.ok) return [];
                            const cards: MentionItem[] = await res.json();
                            return cards;
                        } catch {
                            return [];
                        }
                    },
                    "card"
                ),
            },
        }),
    ], [ydoc, awareness, userName, userColor, workspaceMembers, workspaceSlug, commandItems]);

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

    // Update outline when editor content changes
    useEffect(() => {
        if (!editor) return;

        const updateOutline = () => {
            const items: { level: number, text: string, pos: number }[] = [];
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    items.push({
                        level: node.attrs.level,
                        text: node.textContent,
                        pos
                    });
                }
            });
            setOutline(items);
        };

        editor.on('update', updateOutline);
        updateOutline(); // initial processing

        return () => {
            editor.off('update', updateOutline);
        };
    }, [editor]);

    const isDocumentEmpty = useMemo(() => {
        if (!editor) return false;
        return editor.isEmpty;
    }, [editor, editor?.state.doc.content.size]);

    const insertTemplate = (type: "meeting" | "project") => {
        if (!editor) return;
        let html = "";
        if (type === "meeting") {
            html = `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><h3>Attendees</h3><ul><li><p></p></li></ul><h3>Agenda</h3><ol><li><p></p></li></ol><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`;
        } else if (type === "project") {
            html = `<h2>Project Brief</h2><h3>Overview</h3><p>Brief description of the project.</p><h3>Goals</h3><ul><li><p></p></li></ul><h3>Timeline</h3><table style="width:100%"><tbody><tr><th><p>Phase</p></th><th><p>Deliverable</p></th></tr><tr><td><p></p></td><td><p></p></td></tr></tbody></table>`;
        }
        editor.commands.setContent(html);
        editor.commands.focus('end');
    };

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

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB");
            return;
        }

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // Upload to our Azure blob endpoint
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload failed");
            
            const { url } = await res.json();
            editor.chain().focus().setImage({ src: url }).run();
            toast.success("Image uploaded successfully");
        } catch (err) {
            toast.error("Failed to upload image");
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB");
            return;
        }

        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Upload failed");
            
            const { url } = await res.json();
            onUpdateCoverImage?.(url);
        } catch (error) {
            toast.error("Failed to upload banner");
            console.error(error);
        } finally {
            setUploadingBanner(false);
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        }
    };

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
                            isActive={editor.isActive("code")} title="Inline Code">
                            <Code className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            isActive={editor.isActive("codeBlock")} title="Code Block">
                            <CodeSquare className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={setLink}
                            isActive={editor.isActive("link")} title="Link">
                            <LinkIcon className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()}
                            isActive={editor.isActive("highlight")} title="Highlight">
                            <Highlighter className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5 items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Text Color">
                                    <Palette className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 flex gap-1 bg-popover border shadow-md rounded-lg z-50">
                                {["#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#ffffff", "#94a3b8"].map((color) => (
                                    <button
                                        key={color}
                                        className="w-6 h-6 rounded-full border border-border transition-transform hover:scale-110"
                                        style={{ backgroundColor: color }}
                                        onClick={() => editor.chain().focus().setColor(color).run()}
                                    />
                                ))}
                                <Button variant="ghost" size="sm" className="ml-1 px-2 h-6 text-xs" onClick={() => editor.chain().focus().unsetColor().run()}>Reset</Button>
                            </PopoverContent>
                        </Popover>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-medium" title="Font Family">
                                    <Type className="w-3.5 h-3.5 mr-1" />
                                    Font
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1 flex flex-col gap-0.5 bg-popover border shadow-md rounded-lg z-50">
                                <Button variant="ghost" size="sm" className="justify-start text-sm" style={{ fontFamily: 'Inter, sans-serif' }} onClick={() => editor.chain().focus().setFontFamily('Inter, sans-serif').run()}>Sans Serif</Button>
                                <Button variant="ghost" size="sm" className="justify-start text-sm" style={{ fontFamily: 'ui-serif, Georgia, serif' }} onClick={() => editor.chain().focus().setFontFamily('ui-serif, Georgia, serif').run()}>Serif</Button>
                                <Button variant="ghost" size="sm" className="justify-start text-sm" style={{ fontFamily: 'ui-monospace, monospace' }} onClick={() => editor.chain().focus().setFontFamily('ui-monospace, monospace').run()}>Monospace</Button>
                                <Button variant="ghost" size="sm" className="justify-start text-sm" style={{ fontFamily: 'Comic Sans MS, Comic Sans' }} onClick={() => editor.chain().focus().setFontFamily('Comic Sans MS, Comic Sans').run()}>Comic Sans</Button>
                                <div className="h-px bg-border my-1" />
                                <Button variant="ghost" size="sm" className="justify-start text-xs text-muted-foreground" onClick={() => editor.chain().focus().unsetFontFamily().run()}>Default</Button>
                            </PopoverContent>
                        </Popover>
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
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
                            <AlignLeft className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
                            <AlignCenter className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
                            <AlignRight className="w-4 h-4" />
                        </ToolbarButton>
                    </div>

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5">
                        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} isActive={editor.isActive("table")} title="Insert Table">
                            <TableIcon className="w-4 h-4" />
                        </ToolbarButton>
                        <ToolbarButton onClick={() => imageInputRef.current?.click()} isActive={false} title="Upload Image">
                            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ImageIcon className="w-4 h-4" />}
                        </ToolbarButton>
                        <input type="file" ref={imageInputRef} className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUploadImage} />
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

                    <div className="w-px h-5 bg-border mx-1 self-center" />

                    <div className="flex gap-0.5 ml-auto">
                        <ToolbarButton onClick={() => setOutlineOpen(!outlineOpen)} isActive={outlineOpen} title="Toggle Outline Sidebar">
                            <PanelRight className="w-4 h-4" />
                        </ToolbarButton>
                    </div>
                </div>
            </div>

            {/* Bubble Menu */}
            {editor && (
                <BubbleMenu editor={editor} className="flex overflow-hidden rounded-md border border-border bg-popover shadow-md p-1 gap-1 z-50">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strike">
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} title="Highlight">
                        <Highlighter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} title="Code">
                        <Code className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} title="Link">
                        <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>
                </BubbleMenu>
            )}

            {/* Floating Menu */}
            {editor && (
                <FloatingMenu editor={editor} className="flex overflow-hidden rounded-md border border-border bg-popover shadow-md p-1 gap-1 z-50">
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
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} title="Code Block">
                        <CodeSquare className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} isActive={false} title="Table">
                        <TableIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => imageInputRef.current?.click()} isActive={false} title="Image">
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ImageIcon className="w-4 h-4" />}
                    </ToolbarButton>
                </FloatingMenu>
            )}

            {/* Main Layout (Editor + Sidebar) */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor Scroll Container */}
                <div className="flex-1 overflow-auto p-4 sm:p-8 md:p-12 flex justify-center" onClick={() => editor.chain().focus().run()}>
                    <div className="relative bg-background w-full max-w-[850px] min-h-[1100px] shadow-sm border rounded-sm p-10 sm:p-16 pt-0 sm:pt-0 cursor-text transition-shadow hover:shadow-md page-container">
                        
                        {/* Cover Image Banner */}
                        {coverImage && (
                            <div className="relative group w-auto h-48 sm:h-64 mb-10 -mx-10 sm:-mx-16 rounded-t-sm overflow-hidden bg-muted flex-shrink-0">
                                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                {permission !== "view" && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }} disabled={uploadingBanner}>
                                            {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                            Change Cover
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); onUpdateCoverImage?.(null); }}>
                                            Remove
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                        {!coverImage && <div className="h-10 sm:h-16 flex-shrink-0" />}

                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleUploadBanner} />

                        {/* Editor Wrapper to anchor Empty State to text start */}
                        <div className="relative pb-16">
                            {/* Empty State Quick Actions */}
                            {isDocumentEmpty && (
                                <div className="absolute top-0 left-0 right-0 z-10" contentEditable={false}>
                                    <p className="text-muted-foreground/60 text-sm mb-4 font-medium flex items-center gap-2 mt-4">
                                        <FileText className="w-4 h-4" /> Start from a template
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" className="h-10 text-sm gap-2 border-dashed hover:border-solid hover:bg-muted font-medium bg-background" onClick={(e) => { e.stopPropagation(); insertTemplate("meeting"); }}>
                                            <CalendarDays className="w-4 h-4 text-blue-500" />
                                            Meeting Notes
                                        </Button>
                                        <Button variant="outline" className="h-10 text-sm gap-2 border-dashed hover:border-solid hover:bg-muted font-medium bg-background" onClick={(e) => { e.stopPropagation(); insertTemplate("project"); }}>
                                            <Rocket className="w-4 h-4 text-orange-500" />
                                            Project Brief
                                        </Button>
                                        <Button variant="outline" className="h-10 text-sm gap-2 border-dashed hover:border-solid hover:bg-muted font-medium bg-background" onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }} disabled={uploadingBanner}>
                                            {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <ImageIcon className="w-4 h-4 text-emerald-500" />}
                                            Add Banner
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <EditorContent editor={editor} className={isDocumentEmpty ? "opacity-30 relative z-0" : "relative z-0"} />
                        </div>
                    </div>
                </div>

                {/* Outline Sidebar (Table of Contents) */}
                {outlineOpen && (
                    <div className="hidden xl:flex flex-col w-72 border-l bg-background/50 p-6 overflow-y-auto no-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-widest">Outline</h4>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => setOutlineOpen(false)}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                        {outline.length === 0 ? (
                            <div className="flex flex-col gap-3 opacity-60">
                                <div className="h-3 w-3/4 bg-muted rounded-full" />
                                <div className="h-3 w-1/2 bg-muted rounded-full ml-4" />
                                <div className="h-3 w-2/3 bg-muted rounded-full" />
                                <p className="text-xs text-muted-foreground mt-4 italic">Headings you add to the document will appear here.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {outline.map((item, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            editor.chain().focus().setTextSelection(item.pos).scrollIntoView().run();
                                        }}
                                        className="text-left text-sm text-foreground/70 hover:text-foreground hover:translate-x-0.5 transition-all truncate"
                                        style={{ paddingLeft: `${(item.level - 1) * 12}px`, fontWeight: item.level === 1 ? 500 : 400 }}
                                        title={item.text}
                                    >
                                        {item.text || "Empty Heading"}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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

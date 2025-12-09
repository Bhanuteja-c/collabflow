// src/components/SimpleEditor.tsx — Client-only Tiptap editor
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Undo,
    Redo,
    Quote,
    Code,
    Minus,
    Strikethrough,
} from "lucide-react";

export default function SimpleEditor() {
    const editor = useEditor({
        extensions: [StarterKit],
        content: `
      <h1>Welcome to CollabFlow Editor</h1>
      <p>Start writing here — your changes will be saved automatically.</p>
      <h2>Features</h2>
      <ul>
        <li>Rich text formatting</li>
        <li>Headings and lists</li>
        <li>Code blocks</li>
        <li>Undo/Redo</li>
      </ul>
      <p>Happy collaborating! 🚀</p>
    `,
        editorProps: {
            attributes: {
                class: "prose prose-lg max-w-none focus:outline-none p-8 min-h-[calc(100vh-200px)]",
            },
        },
        immediatelyRender: false,
    });

    if (!editor) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                        Initializing editor...
                    </p>
                </div>
            </div>
        );
    }

    const ToolbarButton = ({
        onClick,
        isActive,
        children,
        title,
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        title: string;
    }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            title={title}
            className={`h-9 w-9 p-0 ${isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
        >
            {children}
        </Button>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
            {/* Toolbar */}
            <div className="sticky top-0 z-10 bg-background border-b">
                <div className="flex items-center gap-1 p-2 flex-wrap">
                    {/* Text Formatting */}
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive("strike")}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        isActive={editor.isActive("code")}
                        title="Code"
                    >
                        <Code className="w-4 h-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Headings */}
                    <ToolbarButton
                        onClick={() =>
                            editor.chain().focus().toggleHeading({ level: 1 }).run()
                        }
                        isActive={editor.isActive("heading", { level: 1 })}
                        title="Heading 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() =>
                            editor.chain().focus().toggleHeading({ level: 2 }).run()
                        }
                        isActive={editor.isActive("heading", { level: 2 })}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Lists */}
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive("blockquote")}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal Rule"
                    >
                        <Minus className="w-4 h-4" />
                    </ToolbarButton>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Undo/Redo */}
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo className="w-4 h-4" />
                    </ToolbarButton>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-background">
                <div className="max-w-4xl mx-auto">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}

// src/components/chat/CodeBlock.tsx
// Syntax-highlighted code block with copy button
"use client";

import { useState } from "react";
import { Check, Copy, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
    code: string;
    language?: string;
}

// Language label mapping
const languageLabels: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    tsx: "TypeScript React",
    jsx: "JavaScript React",
    py: "Python",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    cs: "C#",
    csharp: "C#",
    go: "Go",
    rust: "Rust",
    rb: "Ruby",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    xml: "XML",
    md: "Markdown",
    markdown: "Markdown",
    bash: "Bash",
    sh: "Shell",
    shell: "Shell",
    powershell: "PowerShell",
    ps1: "PowerShell",
    dockerfile: "Dockerfile",
    docker: "Docker",
};

// Language color themes
const languageColors: Record<string, string> = {
    javascript: "text-yellow-400",
    typescript: "text-blue-400",
    python: "text-green-400",
    java: "text-orange-400",
    rust: "text-orange-500",
    go: "text-cyan-400",
    ruby: "text-red-400",
    php: "text-purple-400",
    sql: "text-blue-300",
    html: "text-orange-500",
    css: "text-blue-500",
    json: "text-yellow-300",
    bash: "text-green-300",
};

export function CodeBlock({ code, language = "" }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const normalizedLang = language.toLowerCase().trim();
    const displayLabel = languageLabels[normalizedLang] || language.toUpperCase() || "Code";
    const colorClass = languageColors[normalizedLang] || "text-neutral-400";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="my-2 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 group">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800/50 border-b border-neutral-700">
                <div className="flex items-center gap-2">
                    <Code className={`w-3.5 h-3.5 ${colorClass}`} />
                    <span className={`text-xs font-medium ${colorClass}`}>
                        {displayLabel}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 px-2 text-xs text-neutral-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                        </>
                    )}
                </Button>
            </div>

            {/* Code Content */}
            <div className="overflow-x-auto">
                <pre className="p-3 text-sm font-mono text-neutral-100 leading-relaxed">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
}

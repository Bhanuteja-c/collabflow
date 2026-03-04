// src/components/video/PollPanel.tsx
// Google Meet-style polls panel — create polls and vote
// Enhanced: animated progress bars, Enter key submit, time since, vote transition
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, BarChart3, Check, Clock, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Poll } from "@/hooks/useVideoCall";

interface PollPanelProps {
  isOpen: boolean;
  onClose: () => void;
  polls: Poll[];
  userId: string;
  onCreatePoll: (question: string, options: string[]) => void;
  onVotePoll: (pollId: string, option: string) => void;
}

export function PollPanel({
  isOpen,
  onClose,
  polls,
  userId,
  onCreatePoll,
  onVotePoll,
}: PollPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const questionRef = useRef<HTMLInputElement>(null);

  // Auto-focus question input when creating
  useEffect(() => {
    if (isCreating && questionRef.current) {
      questionRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    onCreatePoll(question.trim(), validOptions.map(o => o.trim()));
    setQuestion("");
    setOptions(["", ""]);
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setQuestion("");
      setOptions(["", ""]);
    }
  };

  const getUserVote = (poll: Poll) => {
    for (const [opt, voters] of Object.entries(poll.votes)) {
      if (voters.includes(userId)) return opt;
    }
    return null;
  };

  const getTotalVotes = (poll: Poll) =>
    Object.values(poll.votes).reduce((sum, v) => sum + v.length, 0);

  const getWinningOption = (poll: Poll) => {
    let maxVotes = 0;
    let winner = "";
    for (const [opt, voters] of Object.entries(poll.votes)) {
      if (voters.length > maxVotes) {
        maxVotes = voters.length;
        winner = opt;
      }
    }
    return maxVotes > 0 ? winner : null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-[#2d2e30] rounded-2xl shadow-2xl border border-[#5f6368]/30 w-full max-w-md mx-4 overflow-hidden max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#5f6368]/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#8ab4f8]/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-[#8ab4f8]" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-[#e8eaed]">Polls</h2>
                  {polls.length > 0 && (
                    <p className="text-[10px] text-[#5f6368]">{polls.length} poll{polls.length !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#9aa0a6] hover:bg-[#3c4043] hover:text-[#e8eaed] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {polls.length === 0 && !isCreating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#3c4043]/50 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-[#5f6368]" />
                  </div>
                  <p className="text-[#9aa0a6] text-sm font-medium">No polls yet</p>
                  <p className="text-[#5f6368] text-xs mt-1 max-w-[200px] mx-auto">
                    Create a poll to engage participants and gather opinions in real time
                  </p>
                </motion.div>
              )}

              {/* Existing Polls */}
              <AnimatePresence mode="popLayout">
                {polls.map((poll, index) => {
                  const myVote = getUserVote(poll);
                  const total = getTotalVotes(poll);
                  const winner = getWinningOption(poll);

                  return (
                    <motion.div
                      key={poll.pollId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[#3c4043]/60 rounded-xl p-4 space-y-3 border border-[#5f6368]/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-[#e8eaed] leading-snug">{poll.question}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <Users className="w-3 h-3 text-[#5f6368]" />
                          <span className="text-[10px] text-[#5f6368] tabular-nums font-medium">
                            {total}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {poll.options.map((opt) => {
                          const count = (poll.votes[opt] || []).length;
                          const pct = total > 0 ? (count / total) * 100 : 0;
                          const isMyVote = myVote === opt;
                          const isWinner = winner === opt && total > 0;

                          return (
                            <motion.button
                              key={opt}
                              onClick={() => onVotePoll(poll.pollId, opt)}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "w-full text-left rounded-xl p-3 relative overflow-hidden transition-all border",
                                isMyVote
                                  ? "border-[#8ab4f8]/40 bg-[#8ab4f8]/8"
                                  : "border-[#5f6368]/20 bg-[#2d2e30]/80 hover:border-[#5f6368]/40 hover:bg-[#2d2e30]"
                              )}
                            >
                              {/* Animated progress bar */}
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-xl",
                                  isWinner
                                    ? "bg-gradient-to-r from-[#8ab4f8]/20 to-[#8ab4f8]/5"
                                    : "bg-[#5f6368]/10"
                                )}
                              />
                              <div className="relative flex items-center justify-between gap-2">
                                <span className="text-xs text-[#e8eaed] flex items-center gap-1.5 font-medium">
                                  {isMyVote && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", damping: 15, stiffness: 400 }}
                                    >
                                      <Check className="w-3.5 h-3.5 text-[#8ab4f8]" />
                                    </motion.span>
                                  )}
                                  {opt}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "text-[11px] tabular-nums font-semibold",
                                    isWinner ? "text-[#8ab4f8]" : "text-[#9aa0a6]"
                                  )}>
                                    {Math.round(pct)}%
                                  </span>
                                  <span className="text-[9px] text-[#5f6368]">
                                    ({count})
                                  </span>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-[#5f6368]">By {poll.createdBy}</p>
                        {myVote && (
                          <span className="text-[10px] text-[#8ab4f8] flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Voted
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Create Poll Form */}
              <AnimatePresence>
                {isCreating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="bg-[#3c4043]/60 rounded-xl p-4 space-y-3 border border-[#8ab4f8]/20"
                      onKeyDown={handleKeyDown}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
                        <span className="text-xs font-medium text-[#8ab4f8]">New Poll</span>
                      </div>
                      <input
                        ref={questionRef}
                        type="text"
                        placeholder="Ask a question..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full bg-[#2d2e30] text-[#e8eaed] text-sm rounded-xl px-4 py-3 border border-[#5f6368]/30 focus:border-[#8ab4f8] outline-none placeholder:text-[#5f6368] transition-colors"
                      />

                      <div className="space-y-2">
                        {options.map((opt, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex gap-2 items-center"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-[#5f6368]/30 flex items-center justify-center shrink-0">
                              <span className="text-[9px] text-[#5f6368] font-bold">{String.fromCharCode(65 + i)}</span>
                            </div>
                            <input
                              type="text"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...options];
                                newOpts[i] = e.target.value;
                                setOptions(newOpts);
                              }}
                              className="flex-1 bg-[#2d2e30] text-[#e8eaed] text-sm rounded-lg px-3 py-2.5 border border-[#5f6368]/30 focus:border-[#8ab4f8] outline-none placeholder:text-[#5f6368] transition-colors"
                            />
                            {options.length > 2 && (
                              <button
                                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[#5f6368] hover:text-[#ea4335] hover:bg-[#ea4335]/10 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {options.length < 6 && (
                        <button
                          onClick={() => setOptions([...options, ""])}
                          className="text-xs text-[#8ab4f8] flex items-center gap-1.5 hover:text-[#aecbfa] transition-colors py-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add option
                        </button>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => { setIsCreating(false); setQuestion(""); setOptions(["", ""]); }}
                          className="flex-1 text-sm text-[#9aa0a6] py-2.5 rounded-full hover:bg-[#2d2e30] transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreate}
                          disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                          className="flex-1 text-sm bg-[#8ab4f8] text-[#202124] font-semibold py-2.5 rounded-full hover:bg-[#aecbfa] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-[#8ab4f8]/20"
                        >
                          Launch poll
                        </button>
                      </div>

                      <p className="text-[10px] text-[#5f6368] text-center">
                        Press Enter to launch · Esc to cancel
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {!isCreating && (
              <div className="px-6 py-4 border-t border-[#5f6368]/20 shrink-0">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full px-5 py-3 rounded-full bg-[#8ab4f8] text-[#202124] text-sm font-semibold hover:bg-[#aecbfa] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:shadow-[#8ab4f8]/20"
                >
                  <Plus className="w-4 h-4" />
                  Create a poll
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

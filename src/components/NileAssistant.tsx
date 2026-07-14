import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Trash2, X, Bot, User, Globe, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface NileAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeCountry: string;
}

export default function NileAssistant({ isOpen, onClose, activeCountry }: NileAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Greetings. I am your senior global affairs counselor at the **Nile Desk**. 

I can provide in-depth historical context, political analyses, economic insights, or search the globe for breaking events. 

How can I assist your inquiry into global affairs today?`,
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsgText = inputValue;
    setInputValue("");
    setError(null);

    // Append user message
    const userMessage: Message = {
      role: "user",
      content: userMsgText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: messages,
          message: userMsgText
        })
      });

      const data = await response.json();
      
      if (data.success && data.responseText) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.responseText,
          timestamp: Date.now()
        }]);
      } else {
        throw new Error(data.error || "Failed to contact the Nile Desk counselor");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("Do you wish to clear your advisory logs with the Nile Desk?")) {
      setMessages([
        {
          role: "assistant",
          content: "Advisory log reset. How may I consult on global events today?",
          timestamp: Date.now()
        }
      ]);
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end" id="nile-assistant-overlay">
        {/* Backdrop close */}
        <div className="absolute inset-0" onClick={onClose}></div>

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md md:max-w-lg bg-brand-surface h-full flex flex-col shadow-2xl border-l border-brand-border z-10"
          id="nile-assistant-drawer"
        >
          {/* Drawer Header */}
          <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-bg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-brand-accent/10 text-brand-accent rounded border border-brand-border animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-brand-primary flex items-center gap-1.5 text-base leading-tight">
                  The Nile Desk
                </h3>
                <span className="text-[10px] font-mono text-brand-secondary uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3 text-brand-accent" />
                  Live AI Advisory • Grounded via Google
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClear}
                className="p-1.5 hover:bg-brand-bg text-brand-secondary hover:text-brand-urgent rounded transition"
                title="Clear Consultation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-brand-bg text-brand-secondary hover:text-brand-primary rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>          {/* Drawer Messages body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 border ${
                  msg.role === "user"
                    ? "bg-brand-primary text-brand-surface border-brand-primary"
                    : "bg-brand-surface text-brand-accent border-brand-border"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`p-3 rounded-lg text-sm leading-relaxed border ${
                  msg.role === "user"
                    ? "bg-brand-bg border-brand-border text-brand-primary"
                    : "bg-brand-surface border-brand-border text-brand-primary"
                }`}>
                  {/* Parse basic markdown formatting like bolding and bullet lists */}
                  <div className="whitespace-pre-wrap font-sans prose dark:prose-invert prose-xs max-w-none">
                    {msg.content.split("\n").map((line, lIdx) => {
                      let processed = line;
                      // Replace bold markdown **text**
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      let parts = [];
                      let lastIndex = 0;
                      let match;
                      
                      while ((match = boldRegex.exec(processed)) !== null) {
                        if (match.index > lastIndex) {
                          parts.push(processed.substring(lastIndex, match.index));
                        }
                        parts.push(<strong key={match.index} className="font-bold text-brand-primary">{match[1]}</strong>);
                        lastIndex = boldRegex.lastIndex;
                      }
                      if (lastIndex < processed.length) {
                        parts.push(processed.substring(lastIndex));
                      }

                      // Check if bullet point
                      if (processed.trim().startsWith("- ") || processed.trim().startsWith("* ")) {
                        const bulletText = processed.replace(/^[-*]\s+/, "");
                        return (
                          <div key={lIdx} className="flex gap-2 pl-2 my-1">
                            <span className="text-brand-accent">•</span>
                            <span>{bulletText}</span>
                          </div>
                        );
                      }

                      return <p key={lIdx} className="mb-1">{parts.length > 0 ? parts : line}</p>;
                    })}
                  </div>
                  <span className="block text-[10px] text-brand-secondary font-mono mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 border bg-brand-surface text-brand-accent border-brand-border animate-bounce">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-brand-bg border border-brand-border rounded-lg text-xs font-mono text-brand-secondary flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping"></span>
                  Consulting international archives via Google Search Grounding...
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-brand-urgent/10 border border-brand-urgent/30 text-brand-urgent rounded text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Counselor Connection Failed</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Drawer Input form */}
          <form onSubmit={handleSend} className="p-4 border-t border-brand-border bg-brand-bg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask about current events in ${activeCountry}...`}
                disabled={isLoading}
                className="flex-1 text-sm bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-brand-primary focus:outline-hidden focus:border-brand-accent placeholder:text-brand-secondary/60"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-3 py-2 bg-brand-primary text-brand-surface rounded-md hover:opacity-90 font-mono text-sm flex items-center justify-center shrink-0 disabled:opacity-55 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

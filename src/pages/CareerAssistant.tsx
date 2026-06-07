import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Loader2, Bot, User as UserIcon, Sparkles, Trash2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "career-assistant-chat-v1";

const SUGGESTIONS = [
  "How do I choose between a job offer and grad school?",
  "What skills should I learn for a data analyst role?",
  "Help me prepare for my first technical interview.",
  "Review my approach to networking on LinkedIn.",
];

const CareerAssistant = () => {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => { taRef.current?.focus(); }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    let assistantText = "";
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: history }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(err.error || "Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistantText += c;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to get reply");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      taRef.current?.focus();
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (!confirm("Clear this conversation?")) return;
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex flex-col h-[calc(100vh-57px)]">
        <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">Career Assistant</h2>
              <p className="text-xs text-muted-foreground font-body">
                Ask anything about careers, skills, internships, or applications.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0 || streaming}>
            <Trash2 size={14} /> Clear
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Bot size={24} />
                </div>
                <h3 className="font-display text-lg font-semibold">How can I help your career today?</h3>
                <p className="text-sm text-muted-foreground font-body max-w-md mx-auto mt-2 mb-6">
                  I'm here to help you explore career paths, sharpen your skills, prepare for interviews, and plan your next move.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-sm font-body p-3 rounded border border-border bg-card hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm font-body whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {m.content || (streaming && i === messages.length - 1
                    ? <Loader2 size={14} className="animate-spin" />
                    : "")}
                </div>
                {m.role === "user" && (
                  <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder="Ask about careers, skills, interviews... (Enter to send, Shift+Enter for newline)"
              className="min-h-[60px] resize-none"
              disabled={streaming}
            />
            <Button onClick={() => sendMessage(input)} disabled={streaming || !input.trim()} size="icon" className="h-auto">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerAssistant;

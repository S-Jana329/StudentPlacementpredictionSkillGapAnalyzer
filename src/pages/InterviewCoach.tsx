import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mic, Send, Plus, Trash2, Loader2, CheckCircle2, MessageSquare } from "lucide-react";

type Session = {
  id: string;
  role: string;
  difficulty: string;
  status: string;
  overall_score: number | null;
  feedback: any | null;
  created_at: string;
};

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const InterviewCoach = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [newRole, setNewRole] = useState("Frontend Developer");
  const [newDifficulty, setNewDifficulty] = useState("medium");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("interview_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    setSessions((data ?? []) as any);
    if (data && data.length && !activeId) setActiveId(data[0].id);
  };

  const loadMessages = async (sid: string) => {
    const { data } = await supabase
      .from("interview_messages")
      .select("id, role, content")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as any);
  };

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const startInterview = async () => {
    if (!user || !newRole.trim()) return;
    const { data, error } = await supabase
      .from("interview_sessions")
      .insert({ user_id: user.id, role: newRole.trim(), difficulty: newDifficulty, status: "active" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setShowStart(false);
    setSessions((prev) => [data as any, ...prev]);
    setActiveId(data.id);
    setMessages([]);
    // Kick off the interviewer's first message
    await streamReply(data.id, data.role, data.difficulty, []);
  };

  const streamReply = async (sid: string, role: string, difficulty: string, history: Msg[]) => {
    setStreaming(true);
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role, difficulty, messages: history }),
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

      // Persist assistant message
      await supabase.from("interview_messages").insert({
        session_id: sid,
        user_id: user!.id,
        role: "assistant",
        content: assistantText,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to get reply");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !activeSession || streaming) return;
    const text = input.trim();
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await supabase.from("interview_messages").insert({
      session_id: activeSession.id,
      user_id: user!.id,
      role: "user",
      content: text,
    });
    await streamReply(activeSession.id, activeSession.role, activeSession.difficulty, next);
  };

  const endInterview = async () => {
    if (!activeSession) return;
    setEndingInterview(true);
    try {
      const { error } = await supabase.functions.invoke("interview-feedback", {
        body: { session_id: activeSession.id },
      });
      if (error) throw error;
      toast.success("Feedback generated");
      await loadSessions();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate feedback");
    } finally {
      setEndingInterview(false);
    }
  };

  const deleteSession = async (s: Session) => {
    if (!confirm(`Delete interview for "${s.role}"?`)) return;
    await supabase.from("interview_sessions").delete().eq("id", s.id);
    if (activeId === s.id) { setActiveId(null); setMessages([]); }
    loadSessions();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border bg-card overflow-y-auto p-4 space-y-3">
          <Button onClick={() => setShowStart(true)} className="w-full" size="sm">
            <Plus size={14} /> New Interview
          </Button>

          <div className="space-y-1">
            <p className="data-label">Your Interviews</p>
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground py-4">No interviews yet.</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  activeId === s.id ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <MessageSquare size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium text-foreground truncate">{s.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">{s.difficulty}</span>
                      {s.status === "completed" ? (
                        <span className="text-xs text-success inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> {s.overall_score}%
                        </span>
                      ) : (
                        <span className="text-xs text-warning">Active</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {showStart && (
            <StartCard
              role={newRole} setRole={setNewRole}
              difficulty={newDifficulty} setDifficulty={setNewDifficulty}
              onStart={startInterview} onClose={() => setShowStart(false)}
            />
          )}

          {!activeSession && !showStart && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Mic className="text-muted-foreground mb-3" size={32} />
              <h3 className="font-display text-lg font-semibold">AI Interview Coach</h3>
              <p className="text-sm text-muted-foreground font-body max-w-md mt-2 mb-4">
                Practice mock interviews with an AI interviewer. Get structured feedback when you're done.
              </p>
              <Button onClick={() => setShowStart(true)}>
                <Plus size={14} /> Start your first interview
              </Button>
            </div>
          )}

          {activeSession && (
            <>
              <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold text-foreground">{activeSession.role}</h2>
                  <p className="text-xs text-muted-foreground font-body capitalize">
                    {activeSession.difficulty} difficulty · {activeSession.status}
                  </p>
                </div>
                {activeSession.status === "active" && messages.length > 2 && (
                  <Button size="sm" variant="outline" onClick={endInterview} disabled={endingInterview || streaming}>
                    {endingInterview ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : "End interview"}
                  </Button>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm font-body ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {m.content || (streaming && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin" /> : "")}
                    </div>
                  </div>
                ))}

                {activeSession.status === "completed" && activeSession.feedback && (
                  <FeedbackCard feedback={activeSession.feedback} score={activeSession.overall_score} />
                )}
              </div>

              {activeSession.status === "active" && (
                <div className="border-t border-border bg-card p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                      }}
                      placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
                      className="min-h-[60px] resize-none"
                      disabled={streaming}
                    />
                    <Button onClick={send} disabled={streaming || !input.trim()} size="icon" className="h-auto">
                      <Send size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const StartCard = ({
  role, setRole, difficulty, setDifficulty, onStart, onClose,
}: any) => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center p-6">
    <div className="section-card max-w-md w-full">
      <h3 className="font-display text-lg font-semibold mb-4">Start mock interview</h3>
      <div className="space-y-4">
        <div>
          <label className="data-label mb-1.5 block">Role you're practicing for</label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Developer" />
        </div>
        <div>
          <label className="data-label mb-1.5 block">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-body"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-6 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onStart}>Start interview</Button>
      </div>
    </div>
  </div>
);

const FeedbackCard = ({ feedback, score }: { feedback: any; score: number | null }) => (
  <div className="section-card border-primary/30 mt-6">
    <div className="flex items-baseline gap-3 mb-3">
      <h3 className="stat-number text-3xl">{score ?? "--"}%</h3>
      <span className="text-sm text-muted-foreground font-body">Overall score</span>
    </div>
    <p className="text-sm font-body text-foreground mb-4">{feedback.summary}</p>

    <div className="grid sm:grid-cols-2 gap-4 mb-4">
      <div>
        <p className="data-label mb-2 text-success">Strengths</p>
        <ul className="space-y-1.5">
          {(feedback.strengths ?? []).map((s: string, i: number) => (
            <li key={i} className="text-xs font-body text-foreground flex gap-2">
              <span className="text-success">✓</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="data-label mb-2 text-destructive">Improvements</p>
        <ul className="space-y-1.5">
          {(feedback.improvements ?? []).map((s: string, i: number) => (
            <li key={i} className="text-xs font-body text-foreground flex gap-2">
              <span className="text-destructive">!</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="mb-4">
      <p className="data-label mb-2">Per-question feedback</p>
      <div className="space-y-2">
        {(feedback.question_feedback ?? []).map((q: any, i: number) => (
          <div key={i} className="border border-border rounded p-3 bg-background">
            <p className="text-xs font-medium text-foreground">{q.question}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={`capitalize font-medium ${
                q.answer_quality === "strong" ? "text-success" :
                q.answer_quality === "weak" ? "text-destructive" : "text-warning"
              }`}>{q.answer_quality}</span> · {q.note}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div>
      <p className="data-label mb-2">Next steps</p>
      <ol className="space-y-1.5 list-decimal list-inside">
        {(feedback.next_steps ?? []).map((s: string, i: number) => (
          <li key={i} className="text-xs font-body text-foreground">{s}</li>
        ))}
      </ol>
    </div>
  </div>
);

export default InterviewCoach;

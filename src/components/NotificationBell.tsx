import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  id: string;
  title: string;
  company: string;
  match_score: number;
  created_at: string;
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("job_recommendations")
      .select("id, title, company, match_score, created_at")
      .eq("user_id", user.id)
      .is("seen_at", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setItems((data ?? []) as Item[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`job-recs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_recommendations", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
        >
          <Bell size={18} className="text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-display font-semibold">Job matches</p>
          <p className="text-xs text-muted-foreground">{count} new match{count === 1 ? "" : "es"}</p>
        </div>
        <div className="max-h-72 overflow-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-xs text-center text-muted-foreground">No new matches yet.</p>
          ) : (
            items.map((it) => (
              <Link
                key={it.id}
                to="/jobs"
                className="block px-3 py-2 hover:bg-muted border-b border-border last:border-b-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-body font-medium text-foreground truncate">{it.title}</p>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    {it.match_score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{it.company}</p>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/jobs"
          className="block text-xs text-center font-body text-primary px-3 py-2 border-t border-border hover:bg-muted"
        >
          View all matches
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;

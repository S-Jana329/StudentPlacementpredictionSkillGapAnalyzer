import { useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 110;

type Props = {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

/** Touch pull-to-refresh wrapper. Only engages when the page is scrolled to the top. */
const PullToRefresh = ({ onRefresh, disabled, children, className }: Props) => {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const atTop = () =>
    (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing || !atTop()) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0 || !atTop()) {
      setPull(0);
      return;
    }
    // Resistance curve
    setPull(Math.min(MAX_PULL, delta * 0.5));
  };

  const onTouchEnd = async () => {
    const shouldRefresh = pull >= THRESHOLD;
    startY.current = null;
    if (!shouldRefresh) {
      setPull(0);
      return;
    }
    setRefreshing(true);
    setPull(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  };

  const active = pull >= THRESHOLD;

  return (
    <div
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{ overscrollBehaviorY: "contain" }}
    >
      <div
        className="flex items-center justify-center overflow-hidden text-xs font-body text-muted-foreground"
        style={{
          height: pull,
          transition: startY.current === null ? "height 200ms ease" : undefined,
        }}
      >
        {pull > 0 && (
          <span className="flex items-center gap-2">
            {refreshing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <ArrowDown
                  size={14}
                  className={`transition-transform ${active ? "rotate-180" : ""}`}
                />
                {active ? "Release to refresh" : "Pull to refresh"}
              </>
            )}
          </span>
        )}
      </div>
      <div
        style={{
          transform: `translateY(${refreshing ? 0 : 0}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;

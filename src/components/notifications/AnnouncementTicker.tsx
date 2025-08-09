import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export type TickerItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode | string;
  urgency: UrgencyLevel;
};

export type AnnouncementTickerProps = {
  items: TickerItem[];
  mode?: "continuous" | "slide"; // default: 'continuous'
  speed?: number; // px/s (continuous) or ms per item (slide)
  pauseOnHover?: boolean; // default: true
  loop?: boolean; // default: true
  divider?: "bar" | "dot" | "slash" | "custom";
  customDivider?: React.ReactNode;
  showClose?: boolean; // deprecated in this project; keep for compat
  showCollapse?: boolean; // show collapse/expand button (default true)
  closeTtlHours?: number; // default: 24
  sticky?: boolean; // default: true
  className?: string;
  dir?: "ltr" | "rtl";
};

// Urgency styles mapped to the project's design tokens
const URGENCY_STYLES: Record<
  UrgencyLevel,
  { container: string; text: string; accent: string }
> = {
  low: {
    container: "bg-muted",
    text: "text-muted-foreground",
    accent: "border-muted",
  },
  medium: {
    container: "bg-warning",
    text: "text-warning-foreground",
    accent: "border-warning",
  },
  high: {
    container: "bg-primary",
    text: "text-primary-foreground",
    accent: "border-primary",
  },
  critical: {
    container: "bg-destructive",
    text: "text-destructive-foreground",
    accent: "border-destructive",
  },
};

function useHoverPause() {
  const [paused, setPaused] = React.useState(false);
  const onMouseEnter = React.useCallback(() => setPaused(true), []);
  const onMouseLeave = React.useCallback(() => setPaused(false), []);
  const onFocusIn = React.useCallback(() => setPaused(true), []);
  const onFocusOut = React.useCallback(() => setPaused(false), []);
  return { paused, onMouseEnter, onMouseLeave, onFocusIn, onFocusOut, setPaused } as const;
}

const CLOSE_KEY = "announcementTicker:closedAt";
const COLLAPSE_KEY = "announcementTicker:collapsed";

function shouldHide(ttlHours: number) {
  try {
    const raw = localStorage.getItem(CLOSE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    const elapsed = Date.now() - ts;
    return elapsed < ttlHours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

const loadCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

export function AnnouncementTicker({
  items,
  mode = "continuous",
  speed = 80,
  pauseOnHover = true,
  loop = true,
  divider = "bar",
  customDivider,
  showClose = false,
  showCollapse = true,
  closeTtlHours = 24,
  sticky = true,
  className,
  dir = "ltr",
}: AnnouncementTickerProps) {
  const [hidden, setHidden] = React.useState(() => shouldHide(closeTtlHours));
  const { paused, onMouseEnter, onMouseLeave, onFocusIn, onFocusOut, setPaused } = useHoverPause();

  // Accessibility: pause when any child receives focus
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onFocusInLocal = () => setPaused(true);
    const onFocusOutLocal = () => setPaused(false);
    el.addEventListener("focusin", onFocusInLocal);
    el.addEventListener("focusout", onFocusOutLocal);
    return () => {
      el.removeEventListener("focusin", onFocusInLocal);
      el.removeEventListener("focusout", onFocusOutLocal);
    };
  }, [setPaused]);

  const [collapsed, setCollapsed] = React.useState<boolean>(() => loadCollapsed());
  const toggleCollapsed = React.useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch {}
  }, [collapsed]);

  const close = React.useCallback(() => {
    try {
      localStorage.setItem(CLOSE_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  }, []);

  if (!items?.length || hidden) return null;

  const baseWrapperCls = cn(
    sticky && "sticky top-0 z-50",
    "w-full border-b",
    // Provide a neutral background so urgency colors stand out as chips/items
    "bg-background",
    className
  );

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Atualizações"
      dir={dir}
      className={baseWrapperCls}
      onMouseEnter={pauseOnHover ? onMouseEnter : undefined}
      onMouseLeave={pauseOnHover ? onMouseLeave : undefined}
      onFocus={pauseOnHover ? onFocusIn : undefined}
      onBlur={pauseOnHover ? onFocusOut : undefined}
    >
      {collapsed ? (
        <div className={cn("mx-auto w-full px-3 sm:px-4 h-[36px] flex items-center justify-between")}> 
          <div className="flex items-center gap-2">
            {React.createElement(icons["Bell"], { className: "h-4 w-4 text-muted-foreground" })}
            <span className="text-sm text-muted-foreground">Atualizações</span>
            <span className="text-xs text-muted-foreground/70">({items.length})</span>
          </div>
        </div>
      ) : (
        <div className={cn("mx-auto w-full px-3 sm:px-4")}> 
          <TickerRow
            items={items}
            mode={mode}
            speed={speed}
            paused={paused}
            loop={loop}
            divider={divider}
            customDivider={customDivider}
          />
        </div>
      )}

      {showCollapse && (
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir barra de anúncios" : "Recolher barra de anúncios"}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full",
            "bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          )}
        >
          {React.createElement(icons[collapsed ? "ChevronDown" : "ChevronUp"]) }
        </button>
      )}
    </div>
  );
}

function Divider({ type, custom }: { type: NonNullable<AnnouncementTickerProps["divider"]>; custom?: React.ReactNode }) {
  if (type === "custom") return <>{custom}</>;
  if (type === "dot") return <span aria-hidden className="mx-3 inline-block h-1 w-1 rounded-full bg-foreground/30" />;
  if (type === "slash") return <span aria-hidden className="mx-3 inline-block select-none text-foreground/50">/</span>;
  // default bar
  return <span aria-hidden className="mx-3 inline-block h-4 w-px bg-foreground/30" />;
}

function ItemChip({ item }: { item: TickerItem }) {
  const IconNode = React.useMemo(() => {
    if (!item.icon) return null;
    if (typeof item.icon === "string") {
      const key = item.icon as keyof typeof icons;
      const Comp = icons[key];
      return Comp ? React.createElement(Comp, { className: "h-4 w-4" }) : null;
    }
    return item.icon;
  }, [item.icon]);

  const styles = URGENCY_STYLES[item.urgency];

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 whitespace-nowrap",
        styles.container,
        styles.text,
        "shadow-sm"
      )}
    >
      {IconNode && <span className="shrink-0">{IconNode}</span>}
      <span className="font-medium">{item.title}</span>
      {item.description && (
        <span className={cn("opacity-80")}>{item.description}</span>
      )}
    </div>
  );

  if (item.href) {
    const isExternal = /^(https?:)?\/\//i.test(item.href);
    if (isExternal) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
        >
          {content}
        </a>
      );
    }
    return (
      <Link to={item.href} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full">
        {content}
      </Link>
    );
  }

  return <div className="focus:outline-none">{content}</div>;
}

function TickerRow({
  items,
  mode,
  speed,
  paused,
  loop,
  divider,
  customDivider,
}: {
  items: TickerItem[];
  mode: NonNullable<AnnouncementTickerProps["mode"]>;
  speed: number;
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
}) {
  if (mode === "slide") {
    return (
      <SlideTicker
        items={items}
        speed={speed}
        paused={paused}
        loop={loop}
        divider={divider}
        customDivider={customDivider}
      />
    );
  }

  return (
    <ContinuousTicker
      items={items}
      speed={speed}
      paused={paused}
      loop={loop}
      divider={divider}
      customDivider={customDivider}
    />
  );
}

function ContinuousTicker({
  items,
  speed,
  paused,
  loop,
  divider,
  customDivider,
}: {
  items: TickerItem[];
  speed: number; // px/s
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [width, setWidth] = React.useState(0);

  // Measure content width
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.scrollWidth / 2); // half, because we duplicate
    };
    measure();
    const resizeObs = new ResizeObserver(measure);
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  }, [items]);

  // RAF loop
  React.useEffect(() => {
    if (!loop) return; // if not loop, we still scroll once until items end
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && speed > 0 && width > 0) {
        setOffset((prev) => {
          const next = prev - speed * dt; // move left
          if (-next >= width) {
            return 0; // reset seamlessly
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, width, loop]);

  // Non-loop mode: stop at the end
  React.useEffect(() => {
    if (loop) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && speed > 0) {
        setOffset((prev) => {
          const next = prev - speed * dt;
          // clamp to end (no reset)
          if (-next >= width) return -width;
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, width, loop]);

  const row = (
    <div className="flex items-center gap-3">
      {items.map((item, idx) => (
        <React.Fragment key={`item-${item.id}-${idx}`}>
          <ItemChip item={item} />
          {idx < items.length - 1 && <Divider type={divider} custom={customDivider} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="relative h-[44px] sm:h-[48px] overflow-hidden" aria-live="polite">
      <div
        ref={trackRef}
        className="absolute left-0 top-1/2 -translate-y-1/2 will-change-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {/* duplicate content for seamless loop */}
        <div className="inline-flex items-center gap-3 pr-6">{row}</div>
        <div className="inline-flex items-center gap-3 pr-6">{row}</div>
      </div>
    </div>
  );
}

function SlideTicker({
  items,
  speed,
  paused,
  loop,
  divider,
  customDivider,
}: {
  items: TickerItem[];
  speed: number; // ms per item
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
}) {
  const [index, setIndex] = React.useState(0);
  const count = items.length;

  React.useEffect(() => {
    if (paused || count === 0) return;
    const delay = Math.max(800, speed); // minimum for readability
    const id = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= count) return loop ? 0 : i; // stop at end if not looping
        return next;
      });
    }, delay);
    return () => clearInterval(id);
  }, [paused, speed, count, loop]);

  return (
    <div className="relative h-[44px] sm:h-[48px] overflow-hidden" aria-live="polite">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(calc(50% - ${index * 100}%))` }}
      >
        <div className="flex items-center gap-3 pr-6">
          {items.map((item, idx) => (
            <React.Fragment key={`slide-${item.id}-${idx}`}>
              <ItemChip item={item} />
              {idx < items.length - 1 && <Divider type={divider} custom={customDivider} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnnouncementTicker;

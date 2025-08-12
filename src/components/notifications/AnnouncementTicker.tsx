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
  showPause?: boolean; // show pause/play button (default true)
  closeTtlHours?: number; // default: 24
  sticky?: boolean; // default: true
  className?: string;
  dir?: "ltr" | "rtl";
  themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>;
  edgeToEdge?: boolean; // if true, removes horizontal paddings and containers
  variant?: "chip" | "plain"; // rendering style for items
};

// Token variants mapping to Tailwind semantic tokens
const TOKEN_CLASSES = {
  muted: { bg: "bg-muted", text: "text-muted-foreground" },
  success: { bg: "bg-success", text: "text-success-foreground" },
  warning: { bg: "bg-warning", text: "text-warning-foreground" },
  primary: { bg: "bg-primary", text: "text-primary-foreground" },
  destructive: { bg: "bg-destructive", text: "text-destructive-foreground" },
  card: { bg: "bg-card", text: "text-foreground" },
} as const;

export type TokenVariant = keyof typeof TOKEN_CLASSES;

// Text-only color classes per token
const TEXT_ONLY_CLASSES: Record<TokenVariant, string> = {
  muted: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  primary: "text-primary",
  destructive: "text-destructive",
  card: "text-foreground",
};

// Default urgency → token
const DEFAULT_URGENCY_MAP: Record<UrgencyLevel, TokenVariant> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
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

// Debug mount
console.debug("AnnouncementTicker: module loaded");

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
  showPause = true,
  closeTtlHours = 24,
  sticky = true,
  className,
  dir = "ltr",
  themeVariant,
  edgeToEdge = false,
  variant = "plain",
}: AnnouncementTickerProps) {
  const [hidden, setHidden] = React.useState<boolean>(() => (showClose ? shouldHide(closeTtlHours) : false));
  const { paused, onMouseEnter, onMouseLeave, onFocusIn, onFocusOut, setPaused } = useHoverPause();
  const [userPaused, setUserPaused] = React.useState(false);
  const effectivePaused = paused || userPaused;
  const toggleUserPaused = React.useCallback(() => setUserPaused((p) => !p), []);

  // Rotating background colors (5s)
  const BG_COLORS = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-purple-500 to-purple-600',
  ] as const;
  const [colorIndex, setColorIndex] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setColorIndex((i) => (i + 1) % BG_COLORS.length), 5000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!showClose) setHidden(false);
  }, [showClose]);

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
  React.useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("announcementTicker:collapse-changed", { detail: collapsed }));
    } catch {}
  }, [collapsed]);
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
    "relative isolate overflow-hidden w-full ticker-root",
    collapsed ? "h-0" : "min-h-[44px] border-b bg-transparent",
    className
  );

  // Inner container classes (controls horizontal padding / full-bleed)
  const innerBaseCls = edgeToEdge
    ? "relative w-full"
    : "relative mx-auto w-full pl-10 pr-10 sm:pl-12 sm:pr-12";

  // Debug render
  console.debug("AnnouncementTicker: render", { items: items?.length ?? 0, hidden, collapsed, userPaused: userPaused, mode, speed });

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Atualizações"
      dir={dir}
      data-ann-root
      className={baseWrapperCls}
      onMouseEnter={pauseOnHover ? onMouseEnter : undefined}
      onMouseLeave={pauseOnHover ? onMouseLeave : undefined}
      onFocus={pauseOnHover ? onFocusIn : undefined}
      onBlur={pauseOnHover ? onFocusOut : undefined}
    >
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-r ${BG_COLORS[colorIndex]} pointer-events-none`}
        aria-hidden style={{ opacity: collapsed ? 0 : 1 }}
      />
      {collapsed ? (
        <div className={cn(innerBaseCls, "h-0")} />
      ) : (
        <div className={cn(innerBaseCls)}>
          <TickerRow
            items={items}
            mode={mode}
            speed={speed}
            paused={effectivePaused}
            loop={loop}
            divider={divider}
            customDivider={customDivider}
            themeVariant={themeVariant}
            variant={variant}
          />
        </div>
      )}


      {showPause && (
        <button
          onClick={toggleUserPaused}
          aria-pressed={userPaused}
          aria-label={userPaused ? "Reproduzir rolagem" : "Pausar rolagem"}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full",
            "bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          )}
        >
          {React.createElement(icons[userPaused ? "Play" : "Pause"]) }
        </button>
      )}

      {showCollapse && (
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir barra de anúncios" : "Recolher barra de anúncios"}
          className={cn(
            collapsed ? "fixed right-2 top-2 z-[60]" : "absolute right-2 top-2",
            "inline-flex h-7 w-7 items-center justify-center rounded-full",
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
  if (type === "dot") return <span aria-hidden className="mx-2 block h-1 w-1 rounded-full bg-border" />;
  if (type === "slash") return <span aria-hidden className="mx-2 block select-none text-muted-foreground">/</span>;
  // default bar - full height divider (flex item)
  return <span aria-hidden className="mx-2 block w-px self-stretch bg-border shrink-0" />;
}

function ItemChip({ item, themeVariant, variant = "chip" }: { item: TickerItem; themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>; variant?: "chip" | "plain" }) {
  const IconNode = React.useMemo(() => {
    if (!item.icon) return null;
    if (typeof item.icon === "string") {
      const key = item.icon as keyof typeof icons;
      const Comp = icons[key];
      return Comp ? React.createElement(Comp, { className: "h-4 w-4" }) : null;
    }
    return item.icon;
  }, [item.icon]);

  const token = (themeVariant?.[item.urgency] ?? DEFAULT_URGENCY_MAP[item.urgency]);

  if (variant === "plain") {
    const textColor = TEXT_ONLY_CLASSES[token];
    const content = (
      <span className={cn("font-bold whitespace-nowrap inline-flex items-center justify-center text-center", textColor)}>
        {item.title}
      </span>
    );

    if (item.href) {
      const isExternal = /^(https?:)?\/\//i.test(item.href);
      if (isExternal) {
        return (
          <a href={item.href} target="_blank" rel="noopener noreferrer" className="focus:outline-none focus:ring-2 focus:ring-ring rounded">
            {content}
          </a>
        );
      }
      return (
        <Link to={item.href} className="focus:outline-none focus:ring-2 focus:ring-ring rounded">
          {content}
        </Link>
      );
    }
    return content;
  }

  // default chip variant
  const cls = TOKEN_CLASSES[token];
  const styles = { container: cls.bg, text: cls.text };
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

// CSS-based continuous ticker (right-to-left) for plain text variant
function CssContinuousTicker({
  items,
  speed,
  divider,
  customDivider,
  themeVariant,
  variant,
}: {
  items: TickerItem[];
  speed: number; // px/s
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
  themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>;
  variant: NonNullable<AnnouncementTickerProps["variant"]>;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [copies, setCopies] = React.useState(2);

  // Ensure we have enough copies to cover at least 2x viewport width
  React.useLayoutEffect(() => {
    const vw = viewportRef.current?.offsetWidth ?? 0;
    const tw = trackRef.current?.scrollWidth ?? 0;
    if (!vw || !tw) return;
    const base = Math.max(1, Math.floor(tw / Math.max(1, copies)));
    const minWidth = vw * 2;
    const reps = Math.ceil(minWidth / base);
    setCopies(Math.max(2, reps + 1));
  }, [items]);

  // Set duration based on half of total width (block A)
  React.useLayoutEffect(() => {
    const tw = trackRef.current?.scrollWidth ?? 0;
    const base = Math.max(1, Math.floor(tw / Math.max(1, copies)));
    const duration = Math.max(20, Math.round(base / Math.max(1, speed)));
    if (trackRef.current) {
      trackRef.current.style.setProperty("--ticker-duration", `${duration}s`);
    }
  }, [copies, items, speed]);

  const block = (
    <div className="flex items-stretch gap-2">
      {items.map((item, idx) => (
        <span key={`css-item-${item.id}-${idx}`} className="contents">
          <ItemChip item={item} themeVariant={themeVariant} variant={variant} />
          {idx < items.length - 1 && <Divider type={divider} custom={customDivider} />}
        </span>
      ))}
    </div>
  );

  return (
    <div ref={viewportRef} className="ticker-viewport relative h-[32px] sm:h-[38px] overflow-hidden" aria-live="polite">
      <div
        ref={trackRef}
        className="ticker-track absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-stretch gap-2 pr-4 will-change-transform"
      >
        {Array.from({ length: copies }).map((_, i) => (
          <div key={`blk-${i}`} className="inline-flex items-stretch gap-2 pr-4">
            {block}
            <Divider type={divider} custom={customDivider} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TickerRow({
  items,
  mode,
  speed,
  paused,
  loop,
  divider,
  customDivider,
  themeVariant,
  variant,
}: {
  items: TickerItem[];
  mode: NonNullable<AnnouncementTickerProps["mode"]>;
  speed: number;
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
  themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>;
  variant: NonNullable<AnnouncementTickerProps["variant"]>;
}) {
  // Single item: use slide mode to avoid duplicated text in continuous ticker
  if (items.length <= 1) {
    return (
      <SlideTicker
        items={items}
        speed={speed}
        paused={paused}
        loop={loop}
        divider={divider}
        customDivider={customDivider}
        themeVariant={themeVariant}
        variant={variant}
      />
    );
  }
  if (mode === "slide") {
    return (
      <SlideTicker
        items={items}
        speed={speed}
        paused={paused}
        loop={loop}
        divider={divider}
        customDivider={customDivider}
        themeVariant={themeVariant}
        variant={variant}
      />
    );
  }

  if (false) {
    return (
      <CssContinuousTicker
        items={items}
        speed={speed}
        divider={divider}
        customDivider={customDivider}
        themeVariant={themeVariant}
        variant={variant}
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
      themeVariant={themeVariant}
      variant={variant}
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
  themeVariant,
  variant,
}: {
  items: TickerItem[];
  speed: number; // px/s
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
  themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>;
  variant: NonNullable<AnnouncementTickerProps["variant"]>;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [baseWidth, setBaseWidth] = React.useState(0); // width of a single row
  const [repeatCount, setRepeatCount] = React.useState(2);
  const initializedRef = React.useRef(false);

  // Measure using layout effect to set initial offset before paint and keep exactly 2 copies
  React.useLayoutEffect(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    const measure = () => {
      const copies = 2;
      const bw = Math.max(1, Math.floor(track.scrollWidth / copies));
      const cw = container.clientWidth;
      setBaseWidth(bw);
      if (repeatCount !== copies) setRepeatCount(copies);
      // Start from the right edge so items enter the viewport from the end without flashing
      if (!initializedRef.current && cw > 0) {
        setOffset(cw);
        initializedRef.current = true;
      }
    };

    measure();
    const ro1 = new ResizeObserver(measure);
    const ro2 = new ResizeObserver(measure);
    ro1.observe(track);
    ro2.observe(container);
    return () => {
      ro1.disconnect();
      ro2.disconnect();
    };
  }, [items]);

  // Re-initialize start position when items change
  React.useEffect(() => {
    initializedRef.current = false;
  }, [items]);

  // RAF loop (looping)
  React.useEffect(() => {
    if (!loop) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && speed > 0 && baseWidth > 0) {
        setOffset((prev) => {
          const next = prev - speed * dt;
          if (-next >= baseWidth) {
            const cw = containerRef.current?.clientWidth ?? 0;
            return cw; // reinicia entrando pela direita
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, baseWidth, loop]);

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
          if (-next >= baseWidth) return -baseWidth;
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, baseWidth, loop]);

  const row = (
    <div className="flex items-stretch gap-2">
      {items.map((item, idx) => (
        <span key={`item-${item.id}-${idx}`} className="contents">
          <ItemChip item={item} themeVariant={themeVariant} variant={variant} />
          {idx < items.length - 1 && <Divider type={divider} custom={customDivider} />}
        </span>
      ))}
    </div>
  );

  return (
    <div ref={containerRef} className="relative h-[32px] sm:h-[38px] overflow-hidden" aria-live="polite">
      <div
        ref={trackRef}
        className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex whitespace-nowrap items-stretch gap-2 pr-4 will-change-transform"
        style={{ transform: `translateY(-50%) translateX(${offset}px)` }}
      >
        {Array.from({ length: repeatCount }).map((_, i) => (
          <div key={`row-${i}`} className="inline-flex items-stretch gap-2 pr-4">
            {row}
            <Divider type={divider} custom={customDivider} />
          </div>
        ))}
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
  themeVariant,
  variant,
}: {
  items: TickerItem[];
  speed: number; // ms per item
  paused: boolean;
  loop: boolean;
  divider: NonNullable<AnnouncementTickerProps["divider"]>;
  customDivider?: React.ReactNode;
  themeVariant?: Partial<Record<UrgencyLevel, TokenVariant>>;
  variant: NonNullable<AnnouncementTickerProps["variant"]>;
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
    <div className="relative h-[32px] sm:h-[38px] overflow-hidden" aria-live="polite">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateY(-50%) translateX(calc(50% - ${index * 100}%))` }}
      >
        <div className="flex items-stretch gap-2 pr-4">
          {items.map((item, idx) => (
            <span key={`slide-${item.id}-${idx}`} className="contents">
              <ItemChip item={item} themeVariant={themeVariant} variant={variant} />
              {idx < items.length - 1 && <Divider type={divider} custom={customDivider} />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnnouncementTicker;

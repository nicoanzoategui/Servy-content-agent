type Bar = { key: string; label: string; count: number };

const BAR_MAX_PX = 104;

export function WeeklyWhatsappBars({
  bars,
  caption,
}: {
  bars: Bar[];
  caption: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">{caption}</p>
      <div className="flex h-44 items-end gap-1 border-b border-zinc-200 px-1 pb-1">
        {bars.map((b) => {
          const px = Math.round((b.count / max) * BAR_MAX_PX);
          const heightPx = Math.max(b.count > 0 ? 6 : 2, px);
          return (
            <div
              key={b.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${b.label}: ${b.count}`}
            >
              <span className="text-[10px] font-medium text-zinc-700">{b.count}</span>
              <div
                className="w-3/4 max-w-[2rem] rounded-t bg-emerald-500/90"
                style={{ height: `${heightPx}px` }}
              />
              <span className="max-w-full truncate text-center text-[9px] text-zinc-500">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

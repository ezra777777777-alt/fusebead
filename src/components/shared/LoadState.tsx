"use client";

export function LoadingSkeleton({ label, variant = "list" }: { label: string; variant?: "list" | "form" | "rows" }) {
  const count = variant === "form" ? 5 : variant === "rows" ? 4 : 6;
  return (
    <div aria-busy="true" aria-live="polite" data-phase="loading" className={variant === "rows" ? "divide-y divide-black/10" : "space-y-4"}>
      <p className={variant === "rows" ? "px-5 py-4 text-sm font-black text-black/55" : "text-sm font-black text-black/60"}>{label}</p>
      <div className={variant === "list" ? "grid gap-5 md:grid-cols-2" : variant === "form" ? "grid gap-4" : undefined}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={variant === "rows" ? "px-5 py-5" : "border-2 border-black bg-white p-5 shadow-[4px_4px_0_#000]"}>
            <div className="h-3 w-24 animate-pulse bg-black/10" />
            <div className="mt-4 h-6 w-4/5 animate-pulse bg-black/15" />
            <div className="mt-3 h-4 w-full animate-pulse bg-black/10" />
            <div className="mt-2 h-4 w-2/3 animate-pulse bg-black/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" data-phase="error" className="border-2 border-black bg-white p-8 text-center shadow-[5px_5px_0_#000]">
      <p className="text-lg font-black">没有加载成功</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-black/70">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 border-2 border-black bg-[var(--acid)] px-4 py-2 text-sm font-black">重试</button>
    </div>
  );
}

export function SlovoMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 96 64" aria-hidden="true" focusable="false">
    <path d="M34 8 L14 32 L34 56" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M62 8 L82 32 L62 56" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M48 14 L64 32 L48 50 L32 32 Z" fill="var(--region-accent, #0D6E60)" />
    <path d="M48 24 L56 32 L48 40 L40 32 Z" fill="var(--region-secondary, #BFE8D9)" />
  </svg>;
}

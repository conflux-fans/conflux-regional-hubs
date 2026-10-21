export function SlovoMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 96 64" aria-hidden="true" focusable="false">
    <path d="M12 6 L40 32 L12 58 L12 47 L26.5 32 L12 15 Z" fill="currentColor" />
    <path d="M84 6 L56 32 L84 58 L84 47 L69.5 32 L84 15 Z" fill="currentColor" />
    <path d="M48 15 L65 32 L48 49 L31 32 Z" fill="var(--region-accent, #0D6E60)" />
    <path d="M48 24.5 L55.5 32 L48 39.5 L40.5 32 Z" fill="var(--region-secondary, #BFE8D9)" />
  </svg>;
}

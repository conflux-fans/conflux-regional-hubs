export function KudiLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`kudi-logo ${className}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <path className="kudi-logo-shell" d="M8 25V16a8 8 0 0 1 8-8h12v9H18a1 1 0 0 0-1 1v7H8Zm28-17h12a8 8 0 0 1 8 8v9h-9v-7a1 1 0 0 0-1-1H36V8ZM8 39h9v7a1 1 0 0 0 1 1h10v9H16a8 8 0 0 1-8-8v-9Zm39 0h9v9a8 8 0 0 1-8 8H36v-9h10a1 1 0 0 0 1-1v-7Z" />
        <path className="kudi-logo-cut" d="M22 22h12v8h8v12H30v-8h-8V22Z" />
        <rect className="kudi-logo-signal" x="38" y="22" width="8" height="8" rx="2" />
      </svg>
    </span>
  );
}

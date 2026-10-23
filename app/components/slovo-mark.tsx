export function SlovoMark({ className }: { className?: string }) {
  return (
    <img
      className={className}
      src="/brand/slovo/mark-128.png"
      srcSet="/brand/slovo/mark-128.png 1x, /brand/slovo/mark-256.png 2x, /brand/slovo/mark-512.png 3x"
      width={128}
      height={87}
      alt=""
      aria-hidden="true"
    />
  );
}

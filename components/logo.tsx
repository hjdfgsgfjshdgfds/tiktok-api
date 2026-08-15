export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span className={`logo-mark ${className}`} aria-hidden="true">
      <span className="logo-mark__orbit" />
      <span className="logo-mark__core" />
    </span>
  );
}

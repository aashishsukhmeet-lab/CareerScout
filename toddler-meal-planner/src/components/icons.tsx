/**
 * Inline SVG rather than an icon font or emoji: emoji render differently on
 * every platform and at 6am you want the same glyph you saw yesterday.
 * All icons inherit `currentColor` and size to 1em.
 */
interface IconProps {
  className?: string;
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  );
}

export function SwapIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 7h11l-3-3M17 13H6l3 3" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  );
}

export function CitrusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth={1.7} />
      <path
        d="M10 3v14M3 10h14M5 5l10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth={1.1}
        opacity={0.65}
      />
    </svg>
  );
}

export function AnchorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="4.5" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 3.5 2.8 16h14.4L10 3.5Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.2" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 4 6 10l6 6" />
    </svg>
  );
}

export function TodayTabIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 15.5h16a8 8 0 0 1-16 0Z" strokeLinejoin="round" />
      <path d="M3 19.5h18" />
      <path d="M9 4.5c0 1.4 1.2 1.6 1.2 3s-1.2 1.6-1.2 3M14.5 4.5c0 1.4 1.2 1.6 1.2 3s-1.2 1.6-1.2 3" />
    </svg>
  );
}

export function WeekTabIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.25" y="4.75" width="17.5" height="15.5" rx="3" />
      <path d="M3.25 9.5h17.5M8 3.25v3M16 3.25v3" strokeLinecap="round" />
    </svg>
  );
}

export function TrackerTabIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.2c3.4 3.7 5.6 6.4 5.6 9a5.6 5.6 0 0 1-11.2 0c0-2.6 2.2-5.3 5.6-9Z" />
      <path d="M9.6 13.4 11.4 15.2 14.8 11.6" />
    </svg>
  );
}

export function GroceryTabIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 8.5h17l-1.7 9.2a2.5 2.5 0 0 1-2.5 2.05H7.7a2.5 2.5 0 0 1-2.5-2.05L3.5 8.5Z" />
      <path d="M8.5 8.5 10.5 3.5M15.5 8.5 13.5 3.5" />
    </svg>
  );
}

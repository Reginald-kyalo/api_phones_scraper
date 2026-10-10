import { Link } from 'react-router';

interface LogoProps {
  /** 'dark' = wordmark for light backgrounds; 'light' = for dark backgrounds. */
  variant?: 'dark' | 'light';
  showWordmark?: boolean;
  /** Mark size in px. */
  size?: number;
  className?: string;
}

/**
 * SokoPulse mark: a rounded tile holding a falling price line that ends in a
 * dot — the pulse of the market, read as a price coming down.
 *
 * Ink tile on light backgrounds; a white tile on dark ones so the mark stays
 * visible on the footer. The wordmark is one colour: teal is reserved for
 * actions (DESIGN_RULES.md §2), not brand decoration.
 */
export default function Logo({
  variant = 'dark',
  showWordmark = true,
  size = 32,
  className = '',
}: LogoProps) {
  return (
    <Link to="/" aria-label="SokoPulse home" className={`inline-flex items-center gap-2 flex-shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <rect width="32" height="32" rx="7" fill={variant === 'light' ? '#FFFFFF' : '#0C1416'} />
        <polyline
          points="7,10 13,16 18,13 24,22"
          stroke={variant === 'light' ? '#0C1416' : '#FFFFFF'}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="22" r="3" fill={variant === 'light' ? '#0E7C8B' : '#2BC2D4'} />
      </svg>
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-foreground'
          }`}
          style={{ fontSize: size * 0.5 }}
        >
          Soko<span className="font-medium">Pulse</span>
        </span>
      )}
    </Link>
  );
}

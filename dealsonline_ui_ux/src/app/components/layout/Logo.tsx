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
 * Brand mark: an indigo squircle containing a descending "price drop" line
 * with a coral end-dot — a falling-price chart, on-theme for price comparison.
 */
export default function Logo({
  variant = 'dark',
  showWordmark = true,
  size = 32,
  className = '',
}: LogoProps) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 flex-shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="#0C1416" />
        <polyline
          points="7,10 13,16 18,13 24,22"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="22" r="3" fill="#2BC2D4" />
      </svg>
      {showWordmark && (
        <span
          className={`font-display font-bold tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-foreground'
          }`}
          style={{ fontSize: size * 0.5 }}
        >
          Deals
          <span className={variant === 'light' ? 'text-teal-bright' : 'text-teal-deep'}>
            Online
          </span>
        </span>
      )}
    </Link>
  );
}

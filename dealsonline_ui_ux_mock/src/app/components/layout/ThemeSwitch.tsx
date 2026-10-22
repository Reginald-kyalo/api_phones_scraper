import { useRef } from 'react';
import { useTheme, type ThemeChoice } from '../../lib/theme';

const OPTIONS: { value: ThemeChoice; label: string; description: string }[] = [
  { value: 'system', label: 'System', description: 'System: use device appearance' },
  { value: 'light', label: 'Light', description: 'Light' },
  { value: 'dark', label: 'Dark', description: 'Dark' },
];

/**
 * System / Light / Dark as a radio group. The choice persists in this
 * browser (lib/theme.ts); System follows the device and is the default.
 *
 * A real radio group, not three buttons: arrow keys move and select, only
 * the checked option is in the Tab order, and the selected state is what the
 * radio role announces (design audit, A02). `onDark` restyles it for the
 * footer's ink surface; the mobile menu uses the page tokens.
 */
export function ThemeSwitch({ onDark = false }: { onDark?: boolean }) {
  const { choice, setChoice } = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + OPTIONS.length) % OPTIONS.length;
    setChoice(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span id="theme-label" className={`text-[12px] ${onDark ? 'text-white/60' : 'text-muted-foreground'}`}>
        Theme
      </span>
      <div
        role="radiogroup"
        aria-labelledby="theme-label"
        className={`inline-flex rounded-md border p-0.5 ${onDark ? 'border-white/15' : 'border-border'}`}
      >
        {OPTIONS.map((o, i) => {
          const checked = choice === o.value;
          return (
            <button
              key={o.value}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={o.description}
              tabIndex={checked ? 0 : -1}
              onClick={() => setChoice(o.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(i, 1); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(i, -1); }
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setChoice(o.value); }
              }}
              className={`rounded-sm px-2.5 py-1 text-[12px] transition-colors ${
                onDark
                  ? checked ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white'
                  : checked ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

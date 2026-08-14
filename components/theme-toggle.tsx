'use client';

const STORAGE_KEY = 'credit-count-theme';

// Runs before first paint so a stored choice is applied without a flash of the
// other scheme. Inlined in the document head by the root layout.
export const themeBootstrapScript = `try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Switches between the light and dark schemes and remembers the choice.
 *
 * Which label shows is decided by CSS, not React state: the server cannot know
 * the reader's scheme, so rendering either label would be wrong for a frame and
 * would mismatch on hydration. Both are rendered, and the stylesheet hides one.
 */
export function ThemeToggle({ onPlate = false }: { onPlate?: boolean }) {
  function toggle() {
    const root = document.documentElement;
    const stored = root.dataset.theme;
    const isDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';

    root.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A blocked storage API costs persistence, not the switch itself.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-[3px] p-1.5 transition-colors ${
        onPlate
          ? 'text-[var(--on-plate)]/70 hover:bg-white/10 hover:text-[var(--on-plate)]'
          : 'text-[var(--ink-soft)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] hover:text-[var(--ink)]'
      }`}
    >
      <span className="cc-when-light">
        <Icon path="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        <span className="sr-only">Switch to the dark theme</span>
      </span>
      <span className="cc-when-dark">
        <Icon path="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        <span className="sr-only">Switch to the light theme</span>
      </span>
    </button>
  );
}

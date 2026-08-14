'use client';

import { useEffect, useState } from 'react';

// The whole product is a number that only goes up, so the dashboard shows it
// going up — once, on load. The server-rendered value is the real one: the
// animation only replaces it after mount, and never when motion is reduced.
export function CreditCounter({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (value <= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const duration = Math.min(200 + value * 40, 700);
    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{shown}</>;
}

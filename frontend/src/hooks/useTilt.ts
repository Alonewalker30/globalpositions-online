import { useRef, useCallback } from 'react';

export function useTilt(intensity = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale3d(1.03,1.03,1.03)`;
    el.style.transition = 'transform 0.1s ease';
    const shine = el.querySelector<HTMLElement>('.tilt-shine');
    if (shine) {
      shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,.10) 0%, transparent 65%)`;
      shine.style.opacity = '1';
    }
  }, [intensity]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
    el.style.transition = 'transform 0.5s ease';
    const shine = el.querySelector<HTMLElement>('.tilt-shine');
    if (shine) shine.style.opacity = '0';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

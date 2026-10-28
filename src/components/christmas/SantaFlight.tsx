import { useEffect, useRef, useState } from "react";
import { randomDelay, type ChristmasSettings } from "@/lib/christmas";
import { SantaSleigh } from "./ChristmasArt";

export function SantaFlight({
  settings: s,
  preview = false,
  replay = 0,
}: {
  settings: ChristmasSettings;
  preview?: boolean;
  replay?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const team = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLCanvasElement>(null);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    if (!s.enabled || !s.santaEnabled) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0,
      stopped = false,
      completed = false;
    type Flake = {
      x: number;
      y: number;
      age: number;
      life: number;
      radius: number;
      drift: number;
    };
    let flakes: Flake[] = [];
    const cancel = () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(frame);
      flakes = [];
      if (host.current) host.current.hidden = true;
      const canvas = trail.current;
      if (canvas)
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      setFlying(false);
    };
    const arm = () => {
      if (stopped || media.matches || document.hidden) return;
      if (preview) return;
      timer = setTimeout(
        fly,
        completed
          ? randomDelay(s.intervalMin, s.intervalMax)
          : randomDelay(s.firstDelayMin, s.firstDelayMax),
      );
    };
    const fly = () => {
      if (
        stopped ||
        media.matches ||
        document.hidden ||
        !host.current ||
        !team.current ||
        !trail.current
      )
        return;
      const el = host.current,
        sleigh = team.current,
        canvas = trail.current;
      el.hidden = false;
      setFlying(true);
      const width = el.clientWidth,
        height = el.clientHeight,
        teamWidth = sleigh.getBoundingClientRect().width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const start = performance.now(),
        duration = s.flightSeconds * 1000;
      const top = preview ? 18 : Math.min(110, Math.max(78, height * 0.12));
      let previous = start,
        lastSpawn = start;
      const tick = (now: number) => {
        if (stopped) return;
        const dt = Math.min(50, now - previous);
        previous = now;
        const p = Math.min(1, (now - start) / duration);
        const x = -teamWidth + (width + teamWidth + 20) * p;
        const y = top + Math.sin(p * Math.PI * 2) * 12;
        sleigh.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (s.snowEnabled && p < 1 && now - lastSpawn > 60) {
          lastSpawn = now;
          const count =
            s.snowAmount === "heavy" ? 5 : s.snowAmount === "medium" ? 3 : 1;
          for (let i = 0; i < count; i++)
            flakes.push({
              x: x + teamWidth * 0.07,
              y: y + teamWidth * 0.23,
              age: 0,
              life: 1100 + Math.random() * 800,
              radius: 1 + Math.random() * 1.7,
              drift: 8 + Math.random() * 16,
            });
          if (flakes.length > 180) flakes.splice(0, flakes.length - 180);
        }
        ctx?.clearRect(0, 0, width, height);
        flakes = flakes.filter((f) => f.age < f.life);
        for (const f of flakes) {
          f.age += dt;
          f.x -= dt * 0.016;
          f.y += (dt * f.drift) / 1000;
          if (ctx) {
            ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
            ctx.fillStyle = "#fff8e9";
            ctx.shadowColor = "#86a9c0";
            ctx.shadowBlur = 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (p < 1 || flakes.length) {
          frame = requestAnimationFrame(tick);
        } else {
          el.hidden = true;
          setFlying(false);
          completed = true;
          arm();
        }
      };
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancel();
      if (!document.hidden && !media.matches) {
        if (preview) fly();
        else arm();
      }
    };
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    const onResize = () => resume();
    window.addEventListener("resize", onResize);
    if (preview && !media.matches && !document.hidden) fly();
    else arm();
    return () => {
      stopped = true;
      cancel();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
      window.removeEventListener("resize", onResize);
    };
  }, [
    s.enabled,
    s.santaEnabled,
    s.firstDelayMin,
    s.firstDelayMax,
    s.intervalMin,
    s.intervalMax,
    s.flightSeconds,
    s.snowEnabled,
    s.snowAmount,
    preview,
    replay,
  ]);
  if (!s.enabled || !s.santaEnabled) return null;
  return (
    <div
      ref={host}
      className={`christmas-flight ${preview ? "christmas-flight-preview" : ""}`}
      aria-hidden="true"
      hidden={!flying}
    >
      <canvas ref={trail} className="christmas-snow" />
      <div ref={team} className="christmas-flight-team">
        <SantaSleigh />
      </div>
    </div>
  );
}

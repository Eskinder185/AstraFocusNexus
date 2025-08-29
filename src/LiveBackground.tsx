import React, { useEffect, useRef } from "react";

/**
 * Fullscreen canvas with neon particles + linking lines.
 * Zero interaction with app clicks (pointerEvents: none).
 */
const LiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth * devicePixelRatio);
    let h = (canvas.height = window.innerHeight * devicePixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Config
    const maxParticles = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    const linkDist = 120;
    const speed = 0.4;
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];

    // Init
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
      });
    }

    const draw = () => {
      // Soft clear for trail effect
      ctx.fillStyle = "rgba(8,11,18,0.35)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

        // Node dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "#00e5ff";
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = 1 - d / linkDist;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(0,229,255,${0.45 * alpha})`);
            grad.addColorStop(1, `rgba(124,77,255,${0.45 * alpha})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onResize = () => {
      w = (canvas.width = window.innerWidth * devicePixelRatio);
      h = (canvas.height = window.innerHeight * devicePixelRatio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };

    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="bg-canvas"
      aria-hidden="true"
    />
  );
};

export default LiveBackground;

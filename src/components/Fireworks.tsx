'use client';
import { useEffect, useRef } from 'react';

export default function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x: number; y: number;
      vx: number; vy: number;
      alpha: number; color: string;
      size: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12; // gravity
        this.vx *= 0.98; // air resistance
        this.alpha -= 0.015;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const colors = ['#f0a500', '#2d7a4f', '#d0362a', '#3da066', '#ffffff', '#ffd700'];

    const createFirework = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.5);
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 60; i++) {
        particles.push(new Particle(x, y, color));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (Math.random() < 0.05) createFirework();

      particles = particles.filter(p => p.alpha > 0);
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

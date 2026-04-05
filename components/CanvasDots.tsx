import React, { useRef, useEffect, useCallback } from 'react';

const CanvasDots: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startAnimation = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const colorDot = [
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(255, 77, 90)',
    ];
    const color = 'rgb(81, 162, 233)';

    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'block';
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.8;

    let mousePosition = {
      x: (30 * width) / 100,
      y: (30 * height) / 100,
    };

    let dotsConfig;
    if (width > 1600) {
      dotsConfig = { nb: 600, distance: 70, d_radius: 300 };
    } else if (width > 1300) {
      dotsConfig = { nb: 575, distance: 60, d_radius: 280 };
    } else if (width > 1100) {
      dotsConfig = { nb: 500, distance: 55, d_radius: 250 };
    } else if (width > 800) {
      dotsConfig = { nb: 300, distance: 0, d_radius: 0 };
    } else if (width > 600) {
      dotsConfig = { nb: 200, distance: 0, d_radius: 0 };
    } else {
      dotsConfig = { nb: 100, distance: 0, d_radius: 0 };
    }

    const dots: { nb: number; distance: number; d_radius: number; array: Dot[] } = {
      ...dotsConfig,
      array: [],
    };

    class Dot {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      colour: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = -0.5 + Math.random();
        this.vy = -0.5 + Math.random();
        this.radius = Math.random() * 1.5;
        this.colour = colorDot[Math.floor(Math.random() * colorDot.length)];
      }

      create() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        const viewportMouseX = mousePosition.x;
        const viewportMouseY = mousePosition.y - (window.pageYOffset || document.documentElement.scrollTop);
        const dotDistance = ((this.x - viewportMouseX) ** 2 + (this.y - viewportMouseY) ** 2) ** 0.5;
        const distanceRatio = dotDistance / (width / 1.7);
        ctx.fillStyle = this.colour.slice(0, -1) + `,${Math.max(0.2, 1 - distanceRatio)})`;
        ctx.fill();
      }

      animate() {
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
        else if (this.x < 0 || this.x > width) this.vx = -this.vx;
        this.x += this.vx;
        this.y += this.vy;
      }

      line(otherDot: Dot) {
        if (dots.distance === 0) return;
        if (Math.abs(this.x - otherDot.x) < dots.distance && Math.abs(this.y - otherDot.y) < dots.distance) {
          const viewportMouseX = mousePosition.x;
          const viewportMouseY = mousePosition.y - (window.pageYOffset || document.documentElement.scrollTop);
          const distFromMouse = Math.sqrt(Math.pow(this.x - viewportMouseX, 2) + Math.pow(this.y - viewportMouseY, 2));
          if (distFromMouse < dots.d_radius) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(otherDot.x, otherDot.y);
            let distanceRatio = distFromMouse / dots.d_radius;
            distanceRatio = Math.max(0, distanceRatio - 0.3);
            ctx.strokeStyle = `rgb(81, 162, 233, ${1 - distanceRatio})`;
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    }

    for (let i = 0; i < dots.nb; i++) dots.array.push(new Dot());

    function createAndAnimateDots() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < dots.nb; i++) {
        const dot = dots.array[i];
        dot.create();
        dot.animate();
        for (let j = i + 1; j < dots.nb; j++) dot.line(dots.array[j]);
      }
    }

    const handleMouseMove = (parameter: MouseEvent) => {
      mousePosition.x = parameter.pageX;
      mousePosition.y = parameter.pageY;
      if (dots.nb > 0 && dots.array[0]) {
        dots.array[0].x = parameter.pageX;
        dots.array[0].y = parameter.pageY - (window.pageYOffset || document.documentElement.scrollTop);
      }
    };

    const handleScroll = () => {
      const top = window.pageYOffset || document.documentElement.scrollTop;
      mousePosition.x = width / 2;
      mousePosition.y = height / 2 + top;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    const drawInterval = window.setInterval(createAndAnimateDots, 1000 / 30);

    return () => {
      window.clearInterval(drawInterval);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | undefined;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (cleanup) cleanup();
        cleanup = startAnimation(width, height);
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (cleanup) cleanup();
    };
  }, [startAnimation]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0">
      <canvas ref={canvasRef} className="canvas-2 block"></canvas>
    </div>
  );
};

export default CanvasDots;

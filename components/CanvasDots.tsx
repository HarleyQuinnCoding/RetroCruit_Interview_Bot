import React, { useRef, useEffect, useCallback } from 'react';

const CanvasDots: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {}; // Return empty cleanup if canvas ref is null initially

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {}; // Return empty cleanup if context is null

    const colorDot = [
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(81, 162, 233)',
      'rgb(255, 77, 90)', // 80% of dots are blue. 20% pink
    ];
    const color = 'rgb(81, 162, 233)';

    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.8; // Default opacity for the whole canvas

    let mousePosition = {
      x: (30 * canvas.width) / 100,
      y: (30 * canvas.height) / 100,
    };

    const windowWidth = window.innerWidth;

    let dotsConfig;
    // Adjust dot count and connection logic based on screen size, matching original behavior
    if (windowWidth > 1600) {
      dotsConfig = { nb: 600, distance: 70, d_radius: 300 };
    } else if (windowWidth > 1300) {
      dotsConfig = { nb: 575, distance: 60, d_radius: 280 };
    } else if (windowWidth > 1100) {
      dotsConfig = { nb: 500, distance: 55, d_radius: 250 };
    } else if (windowWidth > 800) { // Only dots, no lines
      dotsConfig = { nb: 300, distance: 0, d_radius: 0 };
    } else if (windowWidth > 600) { // Only dots, no lines
      dotsConfig = { nb: 200, distance: 0, d_radius: 0 };
    } else { // Smallest screens, only dots, no lines
      dotsConfig = { nb: 100, distance: 0, d_radius: 0 };
    }

    const dots: { nb: number; distance: number; d_radius: number; array: Dot[] } = {
      ...dotsConfig,
      array: [],
    };

    if (dots.nb === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return () => {
        // Cleanup event listeners even if no dots are created
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }

    // Moved Dot class declaration before its usage
    class Dot {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      colour: string;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = -0.5 + Math.random();
        this.vy = -0.5 + Math.random();
        this.radius = Math.random() * 1.5;
        this.colour = colorDot[Math.floor(Math.random() * colorDot.length)];
      }

      create() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);

        // Convert document-relative mouse position to viewport-relative
        const viewportMouseX = mousePosition.x;
        const viewportMouseY = mousePosition.y - (window.pageYOffset || document.documentElement.scrollTop);

        const dotDistance =
          ((this.x - viewportMouseX) ** 2 + (this.y - viewportMouseY) ** 2) ** 0.5;
        const distanceRatio = dotDistance / (windowWidth / 1.7); // Adjusted divisor for better effect range

        // Ensure opacity doesn't go below a certain minimum
        ctx.fillStyle = this.colour.slice(0, -1) + `,${Math.max(0.2, 1 - distanceRatio)})`; // Min opacity of 0.2
        ctx.fill();
      }

      animate() {
        if (this.y < 0 || this.y > canvas.height) {
          this.vy = -this.vy;
        } else if (this.x < 0 || this.x > canvas.width) {
          this.vx = -this.vx;
        }
        this.x += this.vx;
        this.y += this.vy;
      }

      line(otherDot: Dot) {
        if (dots.distance === 0) return; // No lines if distance is 0 in config

        // No need for `!otherDot` check, as dots.array is fully populated
        if (
          Math.abs(this.x - otherDot.x) < dots.distance &&
          Math.abs(this.y - otherDot.y) < dots.distance
        ) {
          // Convert document-relative mouse position to viewport-relative
          const viewportMouseX = mousePosition.x;
          const viewportMouseY = mousePosition.y - (window.pageYOffset || document.documentElement.scrollTop);

          const distFromMouse = Math.sqrt(
            Math.pow(this.x - viewportMouseX, 2) +
            Math.pow(this.y - viewportMouseY, 2)
          );

          if (distFromMouse < dots.d_radius) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(otherDot.x, otherDot.y);

            let distanceRatio = distFromMouse / dots.d_radius;
            distanceRatio = Math.max(0, distanceRatio - 0.3); // Make it so it doesn't fade out completely
            ctx.strokeStyle = `rgb(81, 162, 233, ${1 - distanceRatio})`;
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    }

    // Initialize dots.array fully upfront
    for (let i = 0; i < dots.nb; i++) {
      dots.array.push(new Dot());
    }

    // Set initial mouse position and properties for the first dot if it exists
    if (dots.nb > 0) {
      dots.array[0].x = mousePosition.x;
      dots.array[0].y = mousePosition.y - (window.pageYOffset || document.documentElement.scrollTop);
      dots.array[0].radius = 1.5; // Always ensure the mouse dot has a base radius
      dots.array[0].colour = '#51a2e9'; // Specific color for mouse dot
    }

    function createAndAnimateDots() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < dots.nb; i++) {
        const dot = dots.array[i]; // Dot is guaranteed to exist
        dot.create();
        dot.animate();
        for (let j = i + 1; j < dots.nb; j++) {
          dot.line(dots.array[j]); // dots.array[j] is guaranteed to exist
        }
      }
      // Removed special handling for dots.array[0] here as it's done during initialization
    }

    const handleMouseMove = (parameter: MouseEvent) => {
      mousePosition.x = parameter.pageX;
      mousePosition.y = parameter.pageY;
      if (dots.nb > 0 && dots.array[0]) { // dots.array[0] is guaranteed if dots.nb > 0
        dots.array[0].x = parameter.pageX;
        dots.array[0].y = parameter.pageY - (window.pageYOffset || document.documentElement.scrollTop);
      }
    };

    const handleScroll = () => {
      // When scrolling, reset mouse position to center of viewport
      const top = window.pageYOffset || document.documentElement.scrollTop;
      mousePosition.x = window.innerWidth / 2;
      mousePosition.y = window.innerHeight / 2 + top; // Store as document-relative
    };

    const handleResize = () => {
      // Re-initialize animation on resize to adjust canvas dimensions and dot config
      stopAnimation();
      startAnimation();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    const drawInterval = window.setInterval(createAndAnimateDots, 1000 / 30);

    const stopAnimation = () => {
      window.clearInterval(drawInterval);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return stopAnimation;
  }, []);

  useEffect(() => {
    const cleanup = startAnimation();
    return cleanup;
  }, [startAnimation]);

  return (
    <canvas ref={canvasRef} className="canvas-2 fixed inset-0 z-0"></canvas>
  );
};

export default CanvasDots;
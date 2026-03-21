import { useState, useEffect, useCallback } from 'react';
import carouselBot from '@/assets/carousel-bot.png';
import carouselTeam from '@/assets/carousel-team.png';
import carouselCycles from '@/assets/carousel-cycles.png';

const images = [carouselBot, carouselTeam, carouselCycles];

export default function DashboardCarousel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(next, 7000);
    return () => clearInterval(interval);
  }, [next]);

  return (
    <div
      className="neon-card overflow-hidden opacity-0 animate-fade-up p-0"
      style={{ animationFillMode: 'forwards', border: '1.5px solid hsl(var(--neon-cyan))' }}
    >
      <div className="relative w-full" style={{ aspectRatio: '3/2' }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Slide ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? 'bg-[hsl(var(--neon-cyan))] w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

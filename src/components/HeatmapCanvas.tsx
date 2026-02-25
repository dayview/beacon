import React, { useRef, useEffect, useCallback, useState } from 'react';

interface HeatmapPoint {
    x: number;
    y: number;
    intensity: number;
}

interface HeatmapCanvasProps {
    data: HeatmapPoint[];
    width: number;
    height: number;
    radius?: number;
    opacity?: number;
    className?: string;
    colorScheme?: 'thermal' | 'predictive';
}

/**
 * Real HTML5 Canvas heatmap overlay.
 * Renders radial gradients at each data point and applies a color map.
 */
export const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
    data,
    width,
    height,
    radius = 40,
    opacity = 0.6,
    className = '',
    colorScheme = 'thermal',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState({ x: 1, y: 1 });

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                // Determine scale by comparing the container's client size to intrinsic size (which is passed as width/height props assuming they are intrinsic out of the box... wait, the parent explicitly sets width/height from props...)
                // Actually, if LiveAnalytics passes scaled width/height, the prop `width`/`height` are the scaled ones. 
                // Let's use intrinsic board size (1200x800) to find the scale, or we can just derive it from the DOM element.
                // Our data points are recorded at 1200x800 intrinsic.
                const cw = entry.contentRect.width;
                const ch = entry.contentRect.height;
                setScale({ x: cw / 1200, y: ch / 800 });
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ── Step 1: Draw intensity alpha map ──────────────────
        ctx.clearRect(0, 0, width, height);

        // Normalize intensities to 0..1
        const maxIntensity = Math.max(...data.map((p) => p.intensity), 1);

        for (const point of data) {
            const scaledX = point.x * scale.x;
            const scaledY = point.y * scale.y;
            const normalizedIntensity = point.intensity / maxIntensity;
            const r = Math.max(1, radius * (0.5 + normalizedIntensity * 0.5));

            const gradient = ctx.createRadialGradient(scaledX, scaledY, 0, scaledX, scaledY, r);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${normalizedIntensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(scaledX, scaledY, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── Step 2: Colorize the alpha map ────────────────────
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            const alpha = pixels[i + 3]; // Use alpha channel as intensity
            if (alpha === 0) continue;

            const value = alpha / 255;

            let r = 0, g = 0, b = 0;

            if (colorScheme === 'thermal') {
                // Color gradient: blue → cyan → green → yellow → red
                if (value < 0.25) {
                    // Blue to Cyan
                    const t = value / 0.25;
                    r = 0;
                    g = Math.round(255 * t);
                    b = 255;
                } else if (value < 0.5) {
                    // Cyan to Green
                    const t = (value - 0.25) / 0.25;
                    r = 0;
                    g = 255;
                    b = Math.round(255 * (1 - t));
                } else if (value < 0.75) {
                    // Green to Yellow
                    const t = (value - 0.5) / 0.25;
                    r = Math.round(255 * t);
                    g = 255;
                    b = 0;
                } else {
                    // Yellow to Red
                    const t = (value - 0.75) / 0.25;
                    r = 255;
                    g = Math.round(255 * (1 - t));
                    b = 0;
                }
            } else {
                // PREDICTIVE: indigo → violet → fuchsia → pink → rose
                if (value < 0.25) {
                    // Indigo (#4f46e5) to Violet (#7c3aed)
                    const t = value / 0.25;
                    r = Math.round(79 + t * (124 - 79));
                    g = Math.round(70 + t * (58 - 70));
                    b = Math.round(229 + t * (237 - 229));
                } else if (value < 0.5) {
                    // Violet (#7c3aed) to Fuchsia (#a21caf)
                    const t = (value - 0.25) / 0.25;
                    r = Math.round(124 + t * (162 - 124));
                    g = Math.round(58 + t * (28 - 58));
                    b = Math.round(237 + t * (175 - 237));
                } else if (value < 0.75) {
                    // Fuchsia (#a21caf) to Pink (#db2777)
                    const t = (value - 0.5) / 0.25;
                    r = Math.round(162 + t * (219 - 162));
                    g = Math.round(28 + t * (39 - 28));
                    b = Math.round(175 + t * (119 - 175));
                } else {
                    // Pink (#db2777) to Rose (#e11d48)
                    const t = (value - 0.75) / 0.25;
                    r = Math.round(219 + t * (225 - 219));
                    g = Math.round(39 + t * (29 - 39));
                    b = Math.round(119 + t * (72 - 119));
                }
            }

            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = Math.round(alpha * opacity);
        }

        ctx.putImageData(imageData, 0, 0);
    }, [data, width, height, radius, opacity, scale, colorScheme]);

    useEffect(() => {
        draw();
    }, [draw]);

    if (data.length === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
                <p className="text-white/40 text-sm">No heatmap data yet. Run a test session to generate data.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                className={`pointer-events-none absolute inset-0 ${className}`}
                style={{ width, height }}
            />
        </div>
    );
};

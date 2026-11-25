"use client";

const DESTELLOS = [
  { top: "8%", left: "12%", size: 4, delay: "0s", duration: "3.2s" },
  { top: "14%", left: "78%", size: 6, delay: "0.8s", duration: "4.1s" },
  { top: "22%", left: "34%", size: 3, delay: "1.5s", duration: "2.9s" },
  { top: "30%", left: "88%", size: 4, delay: "0.4s", duration: "3.7s" },
  { top: "42%", left: "18%", size: 5, delay: "2.1s", duration: "4.4s" },
  { top: "50%", left: "65%", size: 3, delay: "1.1s", duration: "3.1s" },
  { top: "62%", left: "8%", size: 6, delay: "1.9s", duration: "3.9s" },
  { top: "68%", left: "82%", size: 4, delay: "0.6s", duration: "3.5s" },
  { top: "78%", left: "28%", size: 4, delay: "2.4s", duration: "4.2s" },
  { top: "85%", left: "72%", size: 5, delay: "1.3s", duration: "3.4s" },
  { top: "90%", left: "48%", size: 3, delay: "0.2s", duration: "3.8s" },
  { top: "19%", left: "56%", size: 3, delay: "2.7s", duration: "3.6s" },
];

export function BrillitosNoche() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden motion-reduce:hidden"
    >
      {DESTELLOS.map((d, idx) => (
        <span
          key={idx}
          style={{
            top: d.top,
            left: d.left,
            width: `${d.size}px`,
            height: `${d.size}px`,
            animationDelay: d.delay,
            animationDuration: d.duration,
            boxShadow: "0 0 10px rgba(244, 114, 182, 0.75), 0 0 18px rgba(147, 197, 253, 0.55)",
          }}
          className="absolute rounded-full bg-white/90 animate-pulse"
        />
      ))}
    </div>
  );
}
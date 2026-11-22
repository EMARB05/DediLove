"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Compass, PenLine, Images, Smile } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItemClass = (href) =>
    `flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors ${
      pathname === href
        ? "text-primary font-semibold"
        : "text-on-surface-variant hover:text-primary"
    }`;

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none">
      <div className="px-5 pb-3">
        <div className="pointer-events-auto mx-auto max-w-sm h-16 rounded-full bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_8px_28px_rgba(100,40,50,0.08)] flex items-center justify-between px-3">
          <Link href="/" className={navItemClass("/")}>
            <Heart className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-tight mt-0.5">
              Feed
            </span>
          </Link>

          <Link href="/explorar" className={navItemClass("/explorar")}>
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-tight mt-0.5">
              Explorar
            </span>
          </Link>

          <Link
            href="/crear"
            aria-label="Crear dedicatoria"
            className="flex items-center justify-center w-11 h-11 rounded-full bg-primary-container text-on-primary shadow-[0_6px_18px_rgba(225,29,72,0.3)] hover:scale-105 active:scale-95 transition-all -translate-y-1"
          >
            <PenLine className="w-5 h-5" />
          </Link>

          <Link href="/album/demo" className={navItemClass("/album/demo")}>
            <Images className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-tight mt-0.5">
              Álbum
            </span>
          </Link>

          <Link href="/perfil" className={navItemClass("/perfil")}>
            <Smile className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider leading-tight mt-0.5">
              Perfil
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
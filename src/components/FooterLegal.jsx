"use client";

import Link from "next/link";

export default function FooterLegal({ className = "" }) {
  return (
    <footer
      className={`pt-6 pb-28 sm:pb-6 px-4 text-center text-xs opacity-75 flex flex-wrap justify-center gap-4 ${className}`}
    >
      <Link href="/legal/aviso-legal" className="hover:underline">
        Aviso Legal
      </Link>
      <Link href="/legal/terminos" className="hover:underline">
        Términos
      </Link>
      <Link href="/legal/privacidad" className="hover:underline">
        Privacidad
      </Link>
      <Link href="/legal/cookies" className="hover:underline">
        Cookies
      </Link>
    </footer>
  );
}
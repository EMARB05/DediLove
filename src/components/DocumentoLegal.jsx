import Link from "next/link";

export default function DocumentoLegal({ titulo, actualizado, children }) {
  return (
    <main className="min-h-screen px-4 py-10 max-w-3xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/" className="font-semibold underline underline-offset-4">
          ← Volver a DediLove
        </Link>
        <span className="opacity-70">Última actualización: {actualizado}</span>
      </div>

      <article className="rounded-3xl p-6 sm:p-10 shadow-sm border border-black/10 space-y-5 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold">{titulo}</h1>
        <div className="space-y-4 text-sm sm:text-base">{children}</div>
      </article>

      <nav className="mt-8 pt-6 border-t border-black/10 flex flex-wrap gap-4 text-xs sm:text-sm opacity-80">
        <Link href="/legal/aviso-legal" className="hover:underline">Aviso Legal</Link>
        <Link href="/legal/terminos" className="hover:underline">Términos y Condiciones</Link>
        <Link href="/legal/privacidad" className="hover:underline">Política de Privacidad</Link>
        <Link href="/legal/cookies" className="hover:underline">Política de Cookies</Link>
      </nav>
    </main>
  );
}

"use client";

import { Sun, Moon } from "lucide-react";
import { useTema } from "./ProveedorTema";

export function BotonModoNoche({ className = "" }) {
  const { modoNoche, alternarModoNoche } = useTema();

  return (
    <button
      type="button"
      onClick={alternarModoNoche}
      aria-label={modoNoche ? "Activar modo claro" : "Activar modo oscuro"}
      title={modoNoche ? "Modo claro" : "Modo oscuro"}
      className={`
        inline-flex items-center justify-center
        w-10 h-10 rounded-full
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-offset-2
        ${
          modoNoche
            ? "bg-slate-800 text-amber-300 hover:bg-slate-700"
            : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
        }
        ${className}
      `}
    >
      {modoNoche ? (
        <Sun size={19} strokeWidth={2} />
      ) : (
        <Moon size={19} strokeWidth={2} />
      )}
    </button>
  );
}

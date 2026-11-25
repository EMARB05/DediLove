"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BrillitosNoche } from "./BrillitosNoche";

const TemaContext = createContext({
  modoNoche: false,
  alternarModoNoche: () => {},
});

export function ProveedorTema({ children }) {
  const [modoNoche, setModoNoche] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem("dedilove-modo-noche");
    if (guardado === "true") {
      setModoNoche(true);
    }
  }, []);

  const alternarModoNoche = () => {
    setModoNoche((prev) => {
      const siguiente = !prev;
      localStorage.setItem("dedilove-modo-noche", String(siguiente));
      return siguiente;
    });
  };

  return (
    <TemaContext.Provider value={{ modoNoche, alternarModoNoche }}>
      <div
        className={`relative min-h-screen transition-colors duration-500 ${
          modoNoche
            ? "bg-gradient-to-b from-[#060B19] via-[#0B152E] to-[#070D1F] text-slate-100"
            : "bg-surface text-on-surface"
        }`}
      >
        {modoNoche && <BrillitosNoche />}
        <div className="relative z-10">{children}</div>
      </div>
    </TemaContext.Provider>
  );
}

export function useTema() {
  return useContext(TemaContext);
}
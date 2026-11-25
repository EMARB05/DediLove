"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, query, where, orderBy, getDocs, getDoc, doc, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import BottomNav from "../../components/BottomNav";
import { Trash2 } from "lucide-react";
import { ESTILOS_TEXTO, FONDOS_PAPEL } from "../../lib/estilos";
import { Edit, Bookmark, Lock, Search } from "lucide-react";
import { useTema } from "@/components/ProveedorTema";
import { BotonModoNoche } from "@/components/BotonModoNoche";
import Link from "next/link";

const TABS = [
    { id: "creadas", icon: <Edit />, label: "Mis dedicatorias" },
    { id: "guardadas", icon: <Bookmark />, label: "Guardadas" },
    { id: "albumes", icon: <Lock />, label: "Álbumes privados" },
];

function TarjetaDedicatoria({ d, onEliminar }) {
    const [confirmando, setConfirmando] = useState(false);
    const [borrando, setBorrando] = useState(false);
    const fecha = d.creadoEn?.toDate().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
    });

    //Confirmar borrado
    const confirmarBorrado = async () => {
        setBorrando(true);
        try {
            await onEliminar(d.id);
        } catch (err) {
            console.error("Error al eliminar:", err);
            setBorrando(false);
            setConfirmando(false);
        }
    };
    return (
        <article className={`w-full ${FONDOS_PAPEL[d.acabadoPapel] || FONDOS_PAPEL["rose-silk"]} rounded-4xl p-space-md shadow-[0_4px_20px_rgba(100,40,50,0.04)]`}>
            <div className="flex items-center gap-1.5 mb-space-sm">
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-caps text-label-caps">
                    {d.categoria}
                </span>
                {d.destacada && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps">
                        Destacada ✦
                    </span>
                )}
            </div>

            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-medium">
                Para {d.destinatario}
            </h2>

            <p className={`text-dedication-quote text-on-surface-variant ${ESTILOS_TEXTO[d.estiloTipografia] || ESTILOS_TEXTO.editorial
                } mb-space-md line-clamp-3`}
            >
                “{d.mensaje}”
            </p>

            <div className="flex items-center justify-between pt-space-xs text-on-surface-variant">
                <span className="font-body-sm text-body-sm truncate">
                    {d.despedida} {d.remitente} · {fecha}
                </span>
                <div className="flex items-center gap-1 text-primary">
                    <span
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        favorite
                    </span>
                    <span className="font-label-md text-label-md">{d.likes ?? 0}</span>
                </div>
            </div>
            {onEliminar && (
                <div className="flex items-center justify-end gap-2 pt-space-sm mt-space-sm border-t border-outline-variant/30">
                    {confirmando ? (
                        <>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mr-auto">
                                ¿Eliminar para siempre?
                            </span>
                            <button
                                onClick={() => setConfirmando(false)}
                                disabled={borrando}
                                className="px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarBorrado}
                                disabled={borrando}
                                className="px-3.5 py-1.5 rounded-full bg-error text-on-error font-label-md text-label-md disabled:opacity-60"
                            >
                                {borrando ? "Eliminando…" : "Sí, eliminar"}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setConfirmando(true)}
                            className="flex items-center gap-1 text-on-surface-variant hover:text-error font-label-md text-label-md transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar</span>
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

export default function PerfilPage() {
    const { user, loading, login, logout } = useAuth();
    const [tab, setTab] = useState("creadas");
    const [busqueda, setBusqueda] = useState("");
    const [creadas, setCreadas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const { modoNoche } = useTema();

    const albumesPrivados = useMemo(() => {
        return creadas
            .filter((d) => d.albumPrivado?.activo)
            .map((d) => ({
                id: d.id,
                destinatario: d.destinatario || "Sin nombre",
                remitente: d.remitente || "",
                mensaje: d.mensaje || "",
                totalFotos: d.albumPrivado.totalFotos ?? 0,
                limiteMaximo: d.albumPrivado.limiteMaximo ?? 5,
                permiteAportes: Boolean(d.albumPrivado.permiteAportes),
                fondoUrl: d.albumPrivado.fondoUrl || "",
                creadoEn: d.creadoEn,
            }));
    }, [creadas]);

    const albumesFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return albumesPrivados;
        return albumesPrivados.filter((alb) =>
            [alb.destinatario, alb.remitente, alb.mensaje]
                .filter(Boolean)
                .some((campo) => String(campo).toLowerCase().includes(q))
        );
    }, [albumesPrivados, busqueda]);

    useEffect(() => {
        if (!user) {
            setCreadas([]);
            return;
        }
        setCargando(true);
        const q = query(
            collection(db, "dedicatorias"),
            where("autorId", "==", user.uid),
            orderBy("creadoEn", "desc")
        );
        getDocs(q)
            .then((snap) => setCreadas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
            .catch(console.error)
            .finally(() => setCargando(false));
    }, [user]);

    //Guardadas
    const [guardadas, setGuardadas] = useState([]);

    useEffect(() => {
        if (!user) {
            setGuardadas([]);
            return;
        }

        async function cargarGuardadas() {
            const snap = await getDocs(
                query(
                    collection(db, "users", user.uid, "guardadas"),
                    orderBy("guardadoEn", "desc"),
                    limit(30)
                )
            );

            const resultados = await Promise.all(
                snap.docs.map(async (g) => {
                    try {
                        const d = await getDoc(doc(db, "dedicatorias", g.id));
                        return d.exists() ? { id: d.id, ...d.data() } : null;
                    } catch {
                        return null; // borrada o ya no pública: se omite
                    }
                })
            );

            setGuardadas(resultados.filter(Boolean));
        }

        cargarGuardadas().catch(console.error);
    }, [user]);

    const eliminarDedicatoria = async (id) => {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/dedicatoria/borrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ dedicatoriaId: id }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "No se pudo eliminar");
        }
        setCreadas((prev) => prev.filter((d) => d.id !== id));
    };


    const lista = tab === "guardadas" ? guardadas : creadas;
    const visibles = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        if (!t) return lista;
        return lista.filter((d) =>
            [d.destinatario, d.mensaje, d.categoria].some((v) => v?.toLowerCase().includes(t))
        );
    }, [lista, busqueda]);

    if (loading) {
        return <main className="pt-16 pb-24 px-margin-mobile text-on-surface-variant">Cargando…</main>;
    }

    if (!user) {
        return (
            <main className="flex-1 w-full pt-16 pb-24 px-margin-mobile bg-surface">
                <section className="mt-space-xl bg-surface-container-lowest rounded-lg p-space-lg text-center shadow-sm">
                    <h1 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                        Entra para ver tu espacio
                    </h1>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                        Tus dedicatorias, guardadas y álbumes, todo en un sitio.
                    </p>
                    <button
                        onClick={login}
                        className="h-11 px-6 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-[0_4px_16px_rgba(225,29,72,0.2)] active:scale-95 transition-all"
                    >
                        Continuar con Google
                    </button>
                </section>
            </main>
        );
    }

    const inicial = (user.displayName || "?").charAt(0).toUpperCase();

    return (
        <>
            <main
                className={`flex-1 w-full pt-16 pb-24 px-margin-mobile transition-colors duration-300 ${modoNoche ? "bg-transparent text-slate-100" : "bg-surface text-on-surface"
                    }`}
            >
                <div className="flex flex-col w-full pb-8 space-y-space-md">
                    {/* Cabecera */}
                    <section
                        className={`w-full rounded-lg p-space-md relative overflow-hidden transition-colors duration-300 ${modoNoche
                            ? "bg-slate-900/80 border border-indigo-400/15 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
                            : "bg-surface-container-lowest shadow-[0_4px_24px_rgba(100,40,50,0.05)]"
                            }`}
                    >
                        <div
                            className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl pointer-events-none ${modoNoche
                                ? "bg-gradient-to-br from-amber-300/15 via-rose-400/15 to-transparent"
                                : "bg-primary-fixed/30"
                                }`}
                        />
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary-fixed via-primary-container to-secondary-container p-0.5 shadow-md mb-space-sm">
                                <div
                                    className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${modoNoche ? "bg-slate-950" : "bg-surface-container-lowest"
                                        }`}
                                >
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                                            {inicial}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <h1
                                className={`font-headline-sm text-headline-sm mb-1 transition-colors ${modoNoche ? "text-slate-100" : "text-on-surface"
                                    }`}
                            >
                                {user.displayName}
                            </h1>
                            <p
                                className={`font-body-sm text-body-sm mb-space-md transition-colors ${modoNoche ? "text-amber-200/90" : "text-on-surface-variant"
                                    }`}
                            >
                                Tus recuerdos públicos, cartas guardadas y álbumes.
                            </p>

                            <div
                                className={`w-full grid grid-cols-3 gap-2 rounded-DEFAULT p-space-sm transition-colors ${modoNoche
                                    ? "bg-slate-950/65 border border-indigo-400/10"
                                    : "bg-surface-container-low"
                                    }`}
                            >
                                {[
                                    ["Creadas", creadas.length],
                                    ["Guardadas", guardadas.length],
                                    ["Álbumes", albumesPrivados.length],
                                ].map(([etiqueta, n], i) => (
                                    <div
                                        key={etiqueta}
                                        className={`flex flex-col items-center py-1 ${i === 1
                                            ? modoNoche
                                                ? "border-x border-slate-700/60"
                                                : "border-x border-outline-variant/30"
                                            : ""
                                            }`}
                                    >
                                        <span
                                            className={`font-headline-sm text-headline-sm font-semibold ${modoNoche ? "text-slate-100" : "text-on-surface"
                                                }`}
                                        >
                                            {n}
                                        </span>
                                        <span
                                            className={`font-label-caps text-label-caps mt-0.5 ${modoNoche ? "text-slate-300/80" : "text-on-surface-variant"
                                                }`}
                                        >
                                            {etiqueta}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-space-sm flex flex-wrap items-center justify-center gap-3">
                                <BotonModoNoche className="h-9 px-3" />

                                <button
                                    type="button"
                                    onClick={logout}
                                    className={`font-label-md text-label-md transition-colors ${modoNoche
                                        ? "text-slate-300 hover:text-rose-300"
                                        : "text-on-surface-variant hover:text-primary"
                                        }`}
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Pestañas + búsqueda */}
                    <div className="w-full space-y-space-sm">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-margin-mobile px-margin-mobile">
                            {TABS.map((t) => (
                                <button
                                    type="button"
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all ${tab === t.id
                                        ? "bg-primary-container text-on-primary shadow-sm"
                                        : modoNoche
                                            ? "bg-slate-900/80 text-slate-300 border border-indigo-400/15 hover:text-rose-300"
                                            : "bg-surface-container text-on-surface-variant hover:text-primary"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        <div
                            className={`rounded-full px-3.5 py-2 flex items-center gap-2 transition-colors ${modoNoche
                                ? "bg-slate-900/80 border border-indigo-400/15 shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
                                : "bg-surface-container-lowest shadow-sm"
                                }`}
                        >
                            <Search
                                className={`w-4 h-4 shrink-0 ${modoNoche ? "text-slate-400" : "text-on-surface-variant"
                                    }`}
                            />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por destinatario o texto…"
                                className={`w-full bg-transparent border-0 p-0 font-body-sm text-body-sm focus:outline-none ${modoNoche
                                    ? "text-slate-100 placeholder:text-slate-400/75"
                                    : "text-on-surface placeholder:text-on-surface-variant/70"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex flex-col space-y-space-md">
                        {(tab === "creadas" || tab === "guardadas") &&
                            (cargando ? (
                                <p
                                    className={`font-body-sm ${modoNoche ? "text-slate-300" : "text-on-surface-variant"
                                        }`}
                                >
                                    Cargando…
                                </p>
                            ) : visibles.length ? (
                                visibles.map((d) => (
                                    <TarjetaDedicatoria
                                        key={d.id}
                                        d={d}
                                        onEliminar={tab === "creadas" ? eliminarDedicatoria : undefined}
                                    />
                                ))
                            ) : (
                                <p
                                    className={`text-center font-body-sm py-space-lg ${modoNoche ? "text-slate-300" : "text-on-surface-variant"
                                        }`}
                                >
                                    {busqueda
                                        ? "Sin resultados."
                                        : tab === "creadas"
                                            ? "Todavía no has escrito ninguna dedicatoria."
                                            : "Aún no has guardado ninguna dedicatoria."}
                                </p>
                            ))}

                        {tab === "albumes" && (
                            cargando ? (
                                <p
                                    className={`font-body-sm ${modoNoche ? "text-slate-300" : "text-on-surface-variant"
                                        }`}
                                >
                                    Cargando álbumes…
                                </p>
                            ) : albumesFiltrados.length ? (
                                <div className="flex flex-col gap-4">
                                    {albumesFiltrados.map((alb) => (
                                        <article
                                            key={alb.id}
                                            className={`rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ${modoNoche
                                                    ? "bg-slate-900/80 border border-indigo-400/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
                                                    : "bg-surface-container-lowest shadow-[0_4px_20px_rgba(100,40,50,0.05)]"
                                                }`}
                                        >
                                            {alb.fondoUrl && (
                                                <div
                                                    aria-hidden="true"
                                                    className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
                                                    style={{ backgroundImage: `url(${alb.fondoUrl})` }}
                                                />
                                            )}

                                            <div className="relative z-10 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${modoNoche
                                                                    ? "bg-slate-800/90 text-amber-200 border border-indigo-400/20"
                                                                    : "bg-secondary-fixed text-on-secondary-fixed"
                                                                }`}
                                                        >
                                                            <Lock className="w-3 h-3" />
                                                            <span>Álbum Privado</span>
                                                        </span>

                                                        <span
                                                            className={`text-[11px] font-medium ${modoNoche ? "text-slate-300" : "text-on-surface-variant"
                                                                }`}
                                                        >
                                                            {alb.totalFotos} / {alb.limiteMaximo} fotos
                                                        </span>
                                                    </div>

                                                    <h3
                                                        className={`font-serif text-xl font-semibold truncate ${modoNoche ? "text-slate-100" : "text-on-surface"
                                                            }`}
                                                    >
                                                        Para {alb.destinatario}
                                                    </h3>

                                                    {alb.mensaje && (
                                                        <p
                                                            className={`text-xs line-clamp-1 mt-0.5 ${modoNoche ? "text-amber-200/85" : "text-on-surface-variant"
                                                                }`}
                                                        >
                                                            “{alb.mensaje}”
                                                        </p>
                                                    )}
                                                </div>

                                                <Link
                                                    href={`/album/${alb.id}`}
                                                    className="shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:opacity-95 transition-opacity"
                                                >
                                                    Abrir álbum
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p
                                    className={`text-center font-body-sm py-space-lg ${modoNoche ? "text-slate-300" : "text-on-surface-variant"
                                        }`}
                                >
                                    {busqueda
                                        ? "Sin resultados."
                                        : "Todavía no tienes álbumes privados activos."}
                                </p>
                            )
                        )}
                    </div>
                </div>
            </main>
            <BottomNav />
        </>
    );
}
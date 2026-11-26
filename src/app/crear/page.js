"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTema } from "@/components/ProveedorTema";
import { BotonModoNoche } from "@/components/BotonModoNoche";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import BotonSuscripcionPayPal from "@/components/BotonSuscripcionPayPal";
import Link from "next/link";
import logo from "./../../img/logo.png";
import {
    ChevronLeft,
    Heart,
    Sparkles,
    Edit3,
    PenTool,
    Crown,
    Images,
    Lock,
    KeyRound,
    Eye,
    EyeOff,
    Bookmark,
    Send,
    Loader2,
    Check,
    ImagePlus,
    X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { comprimirYSubirImagen } from "@/lib/cloudinary";
import FooterLegal from "@/components/FooterLegal";

const CATEGORIAS = [
    { id: "Amor", label: "Amor", simbolo: "♡" },
    { id: "Amistad", label: "Amistad", simbolo: "✦" },
    { id: "Familia", label: "Familia", simbolo: "❦" },
    { id: "Agradecimiento", label: "Agradecimiento", simbolo: "🕊️" },
];

const FRASES_RAPIDAS = [
    {
        texto: "「愛してる」",
        etiqueta: "「愛してる」",
        extra: "(Aishiteru)",
    },
    {
        texto: "Je t’aime pour toujours",
        etiqueta: "Je t’aime pour toujours",
        extra: "",
    },
    {
        texto: "「永遠の絆」",
        etiqueta: "「永遠の絆」",
        extra: "(Lazo eterno)",
    },
    {
        texto: "Te amo con toda mi alma",
        etiqueta: "Te amo con toda mi alma",
        extra: "",
    },
    {
        texto: "「いつもありがとう」",
        etiqueta: "「いつもありがとう」",
        extra: "(Gracias siempre)",
    },
];

const ESTILOS_TIPOGRAFIA = [
    {
        id: "editorial",
        nombre: "Editorial",
        subtitulo: "Serif",
        claseTexto: "font-serif not-italic",
        etiquetaIndicador: "Editorial Serif",
    },
    {
        id: "moderna",
        nombre: "Moderna",
        subtitulo: "Sans",
        claseTexto: "font-sans font-medium not-italic",
        etiquetaIndicador: "Moderna Sans",
    },
    {
        id: "romana",
        nombre: "Romana",
        subtitulo: "Cursiva",
        claseTexto: "font-serif italic",
        etiquetaIndicador: "Romana Cursiva",
    },
];

const ACABADOS_PAPEL = [
    {
        id: "blanco",
        nombre: "Blanco",
        colorCirculo: "bg-white border border-slate-300",
        colorIcono: "text-slate-600",
        fondoTarjeta: "bg-white",
    },
    {
        id: "rose-silk",
        nombre: "Seda Rosa",
        colorCirculo: "bg-[#D9AD9A]",
        colorIcono: "text-[#B87970]",
        fondoTarjeta: "bg-[#F5E3D9]",
    },
    {
        id: "gold-foil",
        nombre: "Pan de Oro",
        colorCirculo: "bg-[#D6B45D]",
        colorIcono: "text-[#A47A22]",
        fondoTarjeta: "bg-[#F5E8C7]",
    },
    {
        id: "stardust",
        nombre: "Estelar",
        colorCirculo: "bg-[#C4B5FD]",
        colorIcono: "text-[#8B5CF6]",
        fondoTarjeta: "bg-[#EDE5FF]",
    },
    {
        id: "velvet",
        nombre: "Terciopelo",
        colorCirculo: "bg-[#E8A5B7]",
        colorIcono: "text-[#BE456A]",
        fondoTarjeta: "bg-[#F9DCE3]",
    },
];



export default function EditorDedicatoriaPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const inputFotosRef = useRef(null);
    const { modoNoche } = useTema();
    const [modalPremiumAbierto, setModalPremiumAbierto] = useState(false);
    const [esPremiumLocal, setEsPremiumLocal] = useState(false);
    useEffect(() => {
        setEsPremiumLocal(Boolean(user?.esPremium));
    }, [user?.esPremium]);

    // Conecta aquí el estado real de suscripción de tu usuario en Firestore
    const esPremium = esPremiumLocal || Boolean(user?.esPremium);
    const MAX_FOTOS = esPremium ? 20 : 5;

    const [destinatario, setDestinatario] = useState("");
    const [categoria, setCategoria] = useState("Amor");
    const [mensaje, setMensaje] = useState("");
    const [remitente, setRemitente] = useState("");
    const [estiloTipografia, setEstiloTipografia] = useState(
        ESTILOS_TIPOGRAFIA[0]
    );
    const [acabadoPapel, setAcabadoPapel] = useState(ACABADOS_PAPEL[0]);
    const [albumActivo, setAlbumActivo] = useState(false);

    const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
    const [contrasena, setContrasena] = useState("");
    const [mostrarContrasena, setMostrarContrasena] = useState(false);

    const [estadoPublicacion, setEstadoPublicacion] = useState("idle");
    const [mensajeEstado, setMensajeEstado] = useState("");
    const [errorForm, setErrorForm] = useState("");
    const [avisoBorrador, setAvisoBorrador] = useState(false);
    const [permiteAportes, setPermiteAportes] = useState(false);

    const limiteCaracteres = 500;

    const [cupoAlbum, setCupoAlbum] = useState(null);
    const [comprobandoCupo, setComprobandoCupo] = useState(false);

    const consultarCupoAlbum = async () => {
        if (!user) return null;
        setComprobandoCupo(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/album/cupo", {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setCupoAlbum(data);
                return data;
            }
            return null;
        } catch (err) {
            console.error("Error consultando cupo de álbumes:", err);
            return null;
        } finally {
            setComprobandoCupo(false);
        }
    };

    const manejarToggleAlbum = async (siguienteEstado) => {
        setErrorForm("");
        if (!siguienteEstado) {
            setAlbumActivo(false);
            return;
        }

        const dataCupo = await consultarCupoAlbum();
        if (dataCupo && dataCupo.disponible === false) {
            setAlbumActivo(false);
            setErrorForm(
                esPremium
                    ? `Has alcanzado el límite de ${dataCupo.maximo || 20} álbumes privados en tu cuenta Premium. Puedes seguir creando dedicatorias normales o eliminar algún álbum existente.`
                    : `Ya usaste tus ${dataCupo.maximo} álbumes gratuitos. Elimina alguno o pasa a premium para crear más.`
            );
            return;
        }

        setAlbumActivo(true);
    };

    useEffect(() => {
        return () => {
            fotosSeleccionadas.forEach((foto) => {
                if (foto.previewUrl) {
                    URL.revokeObjectURL(foto.previewUrl);
                }
            });
        };
    }, [fotosSeleccionadas]);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push("/perfil");
            return;
        }
        if (user.displayName) setRemitente((prev) => prev || user.displayName);
    }, [user, loading, router]);

    useEffect(() => {
        if (!esPremium) {
            setEstiloTipografia(ESTILOS_TIPOGRAFIA[0]);
            setAcabadoPapel(ACABADOS_PAPEL[0]);
        }
    }, [esPremium]);

    const seleccionarTipografia = (opcion) => {
        if (!esPremium) {
            setErrorForm(
                "Elegir estilos de letra es exclusivo de DediLove Premium (€2.73/mes con PayPal)."
            );
            return;
        }
        setErrorForm("");
        setEstiloTipografia(opcion);
    };

    const seleccionarAcabado = (acabado) => {
        if (!esPremium && acabado.id !== "blanco") {
            setErrorForm(
                "Los acabados de papel personalizados son de DediLove Premium (€2.73/mes con PayPal). El fondo gratuito es blanco."
            );
            return;
        }
        setErrorForm("");
        setAcabadoPapel(acabado);
    };

    const insertarFrase = (frase) => {
        setMensaje((prev) => {
            const limpia = prev.trim();
            const combinada = limpia.length > 0 ? `${limpia} ${frase}` : frase;
            return combinada.slice(0, limiteCaracteres);
        });
    };

    const abrirSelectorFotos = () => {
        inputFotosRef.current?.click();
    };

    const manejarSeleccionFotos = (e) => {
        const archivos = Array.from(e.target.files || []);
        if (!archivos.length) return;

        const cupoDisponible = MAX_FOTOS - fotosSeleccionadas.length;
        if (cupoDisponible <= 0) {
            setErrorForm(`Solo puedes adjuntar hasta ${MAX_FOTOS} fotos por álbum.`);
            e.target.value = "";
            return;
        }

        const archivosPermitidos = archivos.slice(0, cupoDisponible);
        if (archivos.length > cupoDisponible) {
            setErrorForm(
                `Se añadieron ${archivosPermitidos.length} fotos para respetar el límite máximo de ${MAX_FOTOS}.`
            );
        } else {
            setErrorForm("");
        }

        const nuevasFotos = archivosPermitidos.map((file, idx) => ({
            id: `foto-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            titulo:
                file.name.replace(/\.[^/.]+$/, "") ||
                `Recuerdo ${fotosSeleccionadas.length + idx + 1}`,
            previewUrl: URL.createObjectURL(file),
            file,
        }));

        setFotosSeleccionadas((prev) => [...prev, ...nuevasFotos]);
        e.target.value = "";
    };

    const eliminarFoto = (id) => {
        setFotosSeleccionadas((prev) => {
            const objetivo = prev.find((f) => f.id === id);
            if (objetivo?.previewUrl) {
                URL.revokeObjectURL(objetivo.previewUrl);
            }
            return prev.filter((foto) => foto.id !== id);
        });
    };

    const guardarBorrador = () => {
        setAvisoBorrador(true);
        setTimeout(() => setAvisoBorrador(false), 2200);
    };

    const publicarDedicatoria = async () => {
        if (!user) {
            setErrorForm("Inicia sesión con Google para publicar.");
            return;
        }
        if (estadoPublicacion === "saving") return;
        setErrorForm("");

        if (!destinatario.trim()) {
            setErrorForm("Escribe a quién va dirigida la dedicatoria.");
            return;
        }

        if (!mensaje.trim()) {
            setErrorForm("Escribe un mensaje antes de publicar.");
            return;
        }

        if (albumActivo && fotosSeleccionadas.length > MAX_FOTOS) {
            setErrorForm(`El álbum privado admite como máximo ${MAX_FOTOS} fotos.`);
            return;
        }

        if (
            albumActivo &&
            fotosSeleccionadas.length > 0 &&
            contrasena.trim().length < 4
        ) {
            setErrorForm("La contraseña del álbum debe tener al menos 4 caracteres.");
            return;
        }

        try {
            if (albumActivo && fotosSeleccionadas.length > 0) {
                const idToken = await user.getIdToken();
                const resCupo = await fetch("/api/album/cupo", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                const cupo = await resCupo.json().catch(() => ({}));
                if (resCupo.ok && !cupo.disponible) {
                    setErrorForm(
                        esPremium
                            ? `Has alcanzado el límite de ${cupo.maximo || 20} álbumes privados en tu cuenta Premium. Puedes publicar esta dedicatoria sin álbum o eliminar un álbum existente.`
                            : `Ya usaste tus ${cupo.maximo} álbumes gratuitos. Elimina alguno o pasa a premium para crear más.`
                    );

                    return;
                }
            }

            setEstadoPublicacion("saving");
            let fotosSubidas = [];

            if (albumActivo && fotosSeleccionadas.length > 0) {
                for (let i = 0; i < fotosSeleccionadas.length; i++) {
                    const foto = fotosSeleccionadas[i];
                    setMensajeEstado(
                        `Comprimiendo y subiendo foto ${i + 1} de ${fotosSeleccionadas.length}...`
                    );
                    const publicId = await comprimirYSubirImagen(foto.file);
                    fotosSubidas.push({ publicId, titulo: foto.titulo });
                }
            }

            setMensajeEstado("Guardando dedicatoria en Firestore...");

            const tipografiaFinal = esPremium ? estiloTipografia : ESTILOS_TIPOGRAFIA[0];
            const acabadoFinal = esPremium ? acabadoPapel : ACABADOS_PAPEL[0];

            const esDestacada =
                esPremium &&
                (tipografiaFinal.id !== "editorial" || acabadoFinal.id !== "blanco");

            const nuevaDedicatoria = {
                autorId: user.uid,
                publica: true,
                destinatario: destinatario.trim(),
                subtitulo: "",
                categoria,
                etiqueta: esDestacada ? "Destacada" : categoria,
                destacada: esDestacada,
                mensaje: mensaje.trim(),
                remitente: remitente.trim() || "Anónimo",
                despedida: "Con cariño",
                ubicacion: "Publicado en DediLove",
                estiloTipografia: tipografiaFinal.id,
                acabadoPapel: acabadoFinal.id,
                likes: 0,
                comentarios: 0,
                albumPrivado: null,
                creadoEn: serverTimestamp(),
            };

            const docRef = await addDoc(
                collection(db, "dedicatorias"),
                nuevaDedicatoria
            );

            if (fotosSubidas.length > 0) {
                setMensajeEstado("Protegiendo el álbum...");
                const idToken = await user.getIdToken();
                const res = await fetch("/api/album/guardar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        dedicatoriaId: docRef.id,
                        contrasena: contrasena.trim(),
                        fotos: fotosSubidas,
                        permiteAportes,
                    }),
                });
                if (!res.ok) {
                    const { error } = await res.json().catch(() => ({}));
                    throw new Error(error || "No se pudo guardar el álbum privado");
                }
            }

            setEstadoPublicacion("saved");
            setMensajeEstado("¡Dedicatoria publicada!");

            setTimeout(() => {
                if (albumActivo && fotosSubidas.length > 0) {
                    router.push(`/album/${docRef.id}`);
                } else {
                    router.push("/");
                }
            }, 900);
        } catch (err) {
            console.error("Error al publicar:", err);
            setEstadoPublicacion("idle");
            setMensajeEstado("");
            setErrorForm(
                err?.message ||
                "No se pudo guardar la dedicatoria. Revisa tu configuración."
            );
        }
    };

    if (loading || !user) return null;

    return (
        <div
            className={`min-h-screen flex flex-col transition-colors duration-300 ${modoNoche ? "bg-transparent text-slate-100" : "bg-surface text-on-surface"
                }`}
        >
            <input
                ref={inputFotosRef}
                type="file"
                accept="image/*"
                multiple
                onChange={manejarSeleccionFotos}
                className="hidden"
            />

            
{/* Encabezado superior fijo */}
<header
    className={`fixed top-0 w-full z-40 pt-safe backdrop-blur-xl transition-colors duration-300 ${
        modoNoche
            ? "bg-[#081024]/90 border-b border-indigo-400/15 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
            : "bg-surface/90 border-b border-black/[0.04] shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
    }`}
>
    <div className="h-16 max-w-2xl mx-auto px-4 sm:px-5 flex items-center justify-between">

        {/* Lado izquierdo */}
        <div className="flex items-center gap-2.5 min-w-0">

            {/* Volver */}
            <button
                type="button"
                aria-label="Volver"
                onClick={() => router.back()}
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                    modoNoche
                        ? "text-slate-300 hover:text-rose-300 hover:bg-slate-800/80"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                }`}
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div className="w-9 h-9 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden">
                <img
                    src={logo?.src}
                    alt="DediLove"
                    className="w-8 h-8 object-contain"
                />
            </div>

            {/* Identidad */}
            <div className="flex flex-col justify-center min-w-0">
                <span
                    className={`font-serif text-[16px] leading-5 font-semibold truncate ${
                        modoNoche ? "text-slate-100" : "text-on-surface"
                    }`}
                >
                    Nueva dedicatoria
                </span>

                <span
                    className={`text-[10px] leading-4 font-medium tracking-wide ${
                        modoNoche ? "text-slate-400" : "text-on-surface-variant"
                    }`}
                >
                    DediLove
                </span>
            </div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center gap-2 shrink-0">

            <BotonModoNoche className="h-9 px-3" />

            {/* Perfil */}
            <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-serif text-xs font-bold flex items-center justify-center ring-2 ring-primary-fixed/70">
                {(user?.displayName || "D").charAt(0).toUpperCase()}
            </div>
        </div>

    </div>
</header>

            {/* Contenido principal */}
            <main className="flex-1 w-full max-w-2xl mx-auto pt-20 pb-28 px-5">
                {/* Cinta de estado */}
                <div className="flex items-center justify-between py-1.5 mb-3">
                    <div
                        className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${modoNoche
                            ? "bg-slate-900/80 border border-indigo-400/15"
                            : "bg-surface-container-low shadow-2xs"
                            }`}
                    >

                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${modoNoche ? "text-slate-200" : "text-on-surface-variant"
                                }`}
                        >
                            {estadoPublicacion === "saving" && mensajeEstado
                                ? mensajeEstado
                                : avisoBorrador
                                    ? "Borrador guardado"
                                    : "Edición en curso"}
                        </span>
                    </div>


                    <div
                        className={`flex items-center gap-1 ${modoNoche ? "text-amber-200/90" : "text-primary"
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-semibold">
                            {esPremium ? "Plan Premium" : "Plan Gratuito"}
                        </span>
                    </div>
                </div>

                {/* Subencabezado editorial */}
                <div className="mb-5">
                    <h2
                        className={`font-serif text-[28px] leading-[36px] font-medium transition-colors ${modoNoche ? "text-slate-100" : "text-on-surface"
                            }`}
                    >
                        Escribe una dedicatoria
                    </h2>
                    <p
                        className={`text-sm mt-1 transition-colors ${modoNoche ? "text-amber-200/90" : "text-on-surface-variant"
                            }`}
                    >
                        Convierte lo que sientes en un recuerdo duradero y especial.
                    </p>
                </div>

                {errorForm && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-error-container text-on-error-container text-xs sm:text-sm font-medium">
                        {errorForm}
                    </div>
                )}

                <div className="flex flex-col gap-5">
                    {/* Destinatario */}
                    <div
                        className={`p-5 rounded-2xl flex flex-col gap-2 transition-colors ${modoNoche
                            ? "bg-slate-900/80 border border-indigo-400/15 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                            : "bg-surface-container-lowest shadow-xs"
                            }`}
                    >
                        <label
                            htmlFor="recipientInput"
                            className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${modoNoche ? "text-slate-300" : "text-outline"
                                }`}
                        >
                            <span>Para: Destinatario</span>
                            <span
                                className={`font-medium normal-case ${modoNoche ? "text-rose-300" : "text-primary"
                                    }`}
                            >
                                Obligatorio
                            </span>
                        </label>
                        <div className="flex items-center gap-2.5">
                            <Heart
                                className={`w-5 h-5 shrink-0 ${modoNoche ? "text-rose-300" : "text-on-surface-variant"
                                    }`}
                            />
                            <input
                                id="recipientInput"
                                type="text"
                                value={destinatario}
                                onChange={(e) => setDestinatario(e.target.value)}
                                placeholder="¿Para quién es esta dedicatoria? Ej. Elena, Mamá..."
                                className={`w-full bg-transparent border-0 outline-none text-base sm:text-lg ${modoNoche
                                    ? "text-slate-100 placeholder:text-slate-400/70"
                                    : "text-on-surface placeholder:text-on-surface-variant/45"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Categorías */}
                    <div className="flex flex-col gap-2">
                        <span
                            className={`text-[11px] font-bold uppercase tracking-wider px-1 ${modoNoche ? "text-slate-300" : "text-outline"
                                }`}
                        >
                            Elige el vínculo o momento
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {CATEGORIAS.map((cat) => {
                                const activa = categoria === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategoria(cat.id)}
                                        className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${activa
                                            ? "bg-primary text-on-primary shadow-sm"
                                            : modoNoche
                                                ? "bg-slate-900/80 text-slate-300 border border-indigo-400/15 hover:text-rose-300"
                                                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high shadow-2xs"
                                            }`}
                                    >
                                        <span>{cat.label}</span>
                                        <span className="text-xs">{cat.simbolo}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lienzo de la carta */}
                    <div
                        className={`${acabadoPapel.fondoTarjeta} rounded-2xl p-5 flex flex-col relative overflow-hidden transition-all duration-300 ${modoNoche
                            ? "ring-1 ring-indigo-300/20 shadow-[0_14px_34px_rgba(0,0,0,0.5)]"
                            : "shadow-md border border-slate-200/70"
                            }`}
                    >
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-primary-fixed/25 pointer-events-none blur-2xl" />

                        {/* Frases rápidas */}
                        <div className="flex flex-col gap-1.5 mb-3 relative z-10">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                                Frases rápidas (toca para insertar)
                            </span>

                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                                {FRASES_RAPIDAS.map((item) => (
                                    <button
                                        key={item.etiqueta}
                                        type="button"
                                        onClick={() => insertarFrase(item.texto)}
                                        className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-primary-fixed-dim text-on-surface text-xs shadow-2xs whitespace-nowrap transition-colors active:scale-95 shrink-0"
                                    >
                                        <span>{item.etiqueta}</span>
                                        {item.extra && (
                                            <span className="text-on-surface-variant text-[11px] ml-1">
                                                {item.extra}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Área de texto */}
                        <div className="relative w-full z-10">
                            <textarea
                                id="messageContent"
                                rows={5}
                                maxLength={limiteCaracteres}
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                placeholder="Escribe tu dedicatoria desde el corazón..."
                                className={`w-full bg-transparent border-0 outline-none text-[19px] leading-[32px] text-slate-900 placeholder:text-slate-400 resize-none ${estiloTipografia.claseTexto}`}
                            />
                        </div>

                        {/* Indicador de fuente y contador */}
                        <div className="flex items-center justify-between pt-2 mt-1 text-slate-600 relative z-10">
                            <div className="flex items-center gap-1.5">
                                <Edit3 className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[11px] font-bold tracking-wider uppercase">
                                    {estiloTipografia.etiquetaIndicador} • {acabadoPapel.nombre}
                                </span>
                            </div>
                            <div className="text-xs font-medium">
                                <span className="text-primary font-bold">{mensaje.length}</span> /{" "}
                                {limiteCaracteres} caracteres
                            </div>
                        </div>
                    </div>

                    {/* Firma del remitente */}
                    <div
                        className={`p-5 rounded-2xl flex flex-col gap-2 transition-colors ${modoNoche
                            ? "bg-slate-900/80 border border-indigo-400/15 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                            : "bg-surface-container-lowest shadow-xs"
                            }`}
                    >
                        <label
                            htmlFor="senderInput"
                            className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${modoNoche ? "text-slate-300" : "text-outline"
                                }`}
                        >
                            <span>De: Tu firma</span>
                            <span
                                className={`font-normal normal-case ${modoNoche ? "text-slate-400" : "text-on-surface-variant"
                                    }`}
                            >
                                Visible en el muro
                            </span>
                        </label>
                        <div className="flex items-center gap-2.5">
                            <PenTool
                                className={`w-5 h-5 shrink-0 ${modoNoche ? "text-amber-200/90" : "text-secondary"
                                    }`}
                            />
                            <input
                                id="senderInput"
                                type="text"
                                value={remitente}
                                onChange={(e) => setRemitente(e.target.value)}
                                placeholder="Tu nombre o apodo (ej. Julián, Anónimo)"
                                className={`w-full bg-transparent border-0 outline-none text-base sm:text-lg ${modoNoche
                                    ? "text-slate-100 placeholder:text-slate-400/70"
                                    : "text-on-surface placeholder:text-on-surface-variant/45"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Tarjeta de opciones Premium y Álbum Privado */}
                    <div className="rounded-3xl p-5 shadow-md bg-gradient-to-br from-secondary-fixed via-surface-container-lowest to-primary-fixed flex flex-col gap-5 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <Crown className="w-4 h-4 text-secondary" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                                        {esPremium ? "Suscripción Activa" : "Solo Premium"}
                                    </span>
                                </div>
                                <h3 className="font-serif text-[22px] leading-[28px] text-on-surface font-semibold mt-0.5">
                                    Recuerdo Premium
                                </h3>
                                <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                                    {esPremium
                                        ? "Tienes desbloqueadas las tipografías, papeles y álbum privado."
                                        : "Desbloquea fuentes y acabados de papel por €2.73/mes con PayPal."}
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-bold shadow-xs whitespace-nowrap">
                                    €2.73/mes
                                </span>

                                {!esPremium && (
                                    <button
                                        type="button"
                                        onClick={() => setModalPremiumAbierto(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold shadow-sm hover:opacity-95 transition-opacity whitespace-nowrap"
                                    >
                                        <Crown className="w-3.5 h-3.5" />
                                        <span>Hazte Premium</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Selector de tipografía (bloqueado si no es premium) */}
                        <div
                            className={`flex flex-col gap-2 bg-surface-container-lowest/85 backdrop-blur-md p-3.5 rounded-2xl shadow-2xs ${!esPremium ? "opacity-75" : ""
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                                    Estilo de letra
                                </span>
                                {!esPremium && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                                        <Lock className="w-3 h-3" />
                                        Premium
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {ESTILOS_TIPOGRAFIA.map((opcion) => {
                                    const activa = estiloTipografia.id === opcion.id;
                                    const bloqueada = !esPremium && opcion.id !== "editorial";
                                    return (
                                        <button
                                            key={opcion.id}
                                            type="button"
                                            disabled={!esPremium}
                                            onClick={() => seleccionarTipografia(opcion)}
                                            className={`p-2.5 rounded-xl flex flex-col items-center justify-center shadow-2xs text-center transition-all ${activa
                                                ? "bg-primary text-on-primary"
                                                : !esPremium
                                                    ? "bg-surface-container/70 text-on-surface-variant/60 cursor-not-allowed"
                                                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                                                }`}
                                        >
                                            <span
                                                className={`text-sm ${opcion.id === "romana"
                                                    ? "font-serif italic"
                                                    : opcion.id === "editorial"
                                                        ? "font-serif"
                                                        : "font-sans font-semibold"
                                                    }`}
                                            >
                                                {opcion.nombre}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 flex items-center gap-1">
                                                {bloqueada && <Lock className="w-2.5 h-2.5" />}
                                                {opcion.subtitulo}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selector de acabado (bloqueado si no es premium) */}
                        <div
                            className={`flex flex-col gap-2 bg-surface-container-lowest/85 backdrop-blur-md p-3.5 rounded-2xl shadow-2xs ${!esPremium ? "opacity-75" : ""
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                                    Tono y acabado
                                </span>
                                {!esPremium && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-secondary">
                                        <Lock className="w-3 h-3" />
                                        Blanco gratis
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-5 gap-2">
                                {ACABADOS_PAPEL.map((acabado) => {
                                    const seleccionado = acabadoPapel.id === acabado.id;
                                    const bloqueado = !esPremium && acabado.id !== "blanco";
                                    return (
                                        <button
                                            key={acabado.id}
                                            type="button"
                                            disabled={bloqueado}
                                            onClick={() => seleccionarAcabado(acabado)}
                                            className={`flex flex-col items-center gap-1 group ${bloqueado ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                                                }`}
                                        >
                                            <div
                                                className={`w-10 h-10 rounded-full ${acabado.colorCirculo
                                                    } shadow-xs flex items-center justify-center ${acabado.colorIcono
                                                    } transition-transform ${!bloqueado ? "group-hover:scale-105" : ""
                                                    } ${seleccionado ? "ring-2 ring-primary" : ""}`}
                                            >
                                                {bloqueado ? (
                                                    <Lock className="w-3.5 h-3.5" />
                                                ) : seleccionado ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Heart className="w-4 h-4" />
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold uppercase tracking-wider text-center ${seleccionado
                                                    ? "text-on-surface"
                                                    : "text-on-surface-variant"
                                                    }`}
                                            >
                                                {acabado.nombre}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Módulo de Álbum Privado */}
                        <div className="bg-surface-container-lowest/90 backdrop-blur-md p-4 rounded-2xl shadow-2xs flex flex-col gap-3.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-sm text-on-surface flex items-center gap-1.5 font-bold">
                                        <Images className="w-4 h-4 text-primary shrink-0" />
                                        <span>Adjuntar Álbum Privado</span>
                                    </span>
                                    <span className="text-xs text-on-surface-variant">
                                        Hasta {MAX_FOTOS} fotos comprimidas y protegidas con contraseña
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={albumActivo}
                                    aria-label="Activar álbum privado"
                                    disabled={comprobandoCupo}
                                    onClick={() => manejarToggleAlbum(!albumActivo)}
                                    className={`w-12 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 disabled:opacity-50 ${albumActivo
                                        ? "bg-primary justify-end"
                                        : "bg-surface-container-highest justify-start"
                                        }`}
                                >
                                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                                </button>
                                {albumActivo && cupoAlbum && (
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                        Álbumes privados usados: {cupoAlbum.usados} / {cupoAlbum.maximo}
                                    </p>
                                )}
                            </div>

                            {albumActivo && (
                                <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/20">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-on-surface">
                                            Fotos ({fotosSeleccionadas.length}/{MAX_FOTOS})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={abrirSelectorFotos}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-primary text-xs font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            <ImagePlus className="w-3.5 h-3.5" />
                                            <span>Añadir fotos</span>
                                        </button>
                                    </div>

                                    {fotosSeleccionadas.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {fotosSeleccionadas.map((foto) => (
                                                <div
                                                    key={foto.id}
                                                    className="relative aspect-square rounded-xl overflow-hidden bg-surface-container"
                                                >
                                                    <img
                                                        src={foto.previewUrl}
                                                        alt={foto.titulo}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label="Quitar foto"
                                                        onClick={() => eliminarFoto(foto.id)}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        <label
                                            htmlFor="albumPassword"
                                            className="text-xs font-semibold text-on-surface flex items-center gap-1.5"
                                        >
                                            <KeyRound className="w-3.5 h-3.5 text-primary" />
                                            <span>Contraseña del álbum</span>
                                        </label>
                                        <div className="relative flex items-center">
                                            <input
                                                id="albumPassword"
                                                type={mostrarContrasena ? "text" : "password"}
                                                value={contrasena}
                                                onChange={(e) => setContrasena(e.target.value)}
                                                placeholder="Mínimo 4 caracteres"
                                                className="w-full px-3.5 py-2 pr-10 rounded-xl bg-surface-container text-on-surface text-sm outline-none"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Mostrar u ocultar contraseña"
                                                onClick={() => setMostrarContrasena((prev) => !prev)}
                                                className="absolute right-2.5 text-on-surface-variant hover:text-on-surface"
                                            >
                                                {mostrarContrasena ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={permiteAportes}
                                            onChange={(e) => setPermiteAportes(e.target.checked)}
                                            className="rounded accent-primary"
                                        />
                                        <span>Permitir que otras personas aporten fotos</span>
                                    </label>
                                </div>

                            )}
                            <p className="text-xs opacity-70  text-on-surface">
                                Asegúrate de contar con permiso para las fotos que subas y de cumplir los{" "}
                                <Link href="/legal/terminos" target="_blank" className="underline">
                                    Términos de Uso
                                </Link>
                                .
                            </p>
                        </div>
                    </div>

                    {/* Acciones inferiores */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={guardarBorrador}
                            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full text-xs font-semibold transition-colors ${modoNoche
                                ? "bg-slate-900/80 text-slate-200 border border-indigo-400/15 hover:bg-slate-800"
                                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                                }`}
                        >
                            <Bookmark className="w-4 h-4" />
                            <span>Guardar borrador</span>
                        </button>

                        <button
                            type="button"
                            disabled={estadoPublicacion === "saving"}
                            onClick={publicarDedicatoria}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-md hover:opacity-95 disabled:opacity-60 transition-opacity"
                        >
                            {estadoPublicacion === "saving" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            <span>
                                {estadoPublicacion === "saving"
                                    ? "Publicando..."
                                    : "Publicar dedicatoria"}
                            </span>
                        </button>
                    </div>
                </div>

            </main>
            <FooterLegal />
            {modalPremiumAbierto && !esPremium && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div
                        className={`w-full max-w-md rounded-3xl p-6 flex flex-col gap-4 shadow-xl ${modoNoche
                            ? "bg-slate-900 text-slate-100 border border-indigo-400/20"
                            : "bg-surface text-on-surface"
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                                    Suscripción Mensual · €2.73/mes
                                </span>
                                <h4 className="font-serif text-2xl font-semibold mt-0.5">
                                    Pásate a DediLove Premium
                                </h4>
                            </div>
                            <button
                                type="button"
                                aria-label="Cerrar ventana"
                                onClick={() => setModalPremiumAbierto(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <ul className="text-xs sm:text-sm space-y-1.5 opacity-90">
                            <li>• Todas las tipografías (Editorial, Moderna, Romana).</li>
                            <li>• Todos los acabados de papel (Blanco gratis + tonos premium).</li>
                            <li>• Álbumes privados y funciones de recuerdo ampliadas.</li>
                        </ul>

                        {/* Aquí montas <PayPalButtons /> con createSubscription y onApprove */}

                        <div className="rounded-2xl p-3 bg-white text-slate-900">
                            {user?.uid ? (

                                <BotonSuscripcionPayPal
                                    userId={user.uid}
                                    onSuccess={async () => {
                                        setEsPremiumLocal(true);
                                        setModalPremiumAbierto(false);
                                    }}
                                />

                            ) : (
                                <p className="text-center text-xs font-medium text-amber-700">
                                    Inicia sesión primero para activar tu suscripción.
                                </p>
                            )}
                        </div>
                        <p className="text-xs opacity-75 leading-relaxed">
                            Suscripción recurrente gestionada con PayPal. Al continuar, aceptas los{" "}
                            <Link href="/legal/terminos" target="_blank" className="underline">
                                Términos y Condiciones
                            </Link>{" "}
                            y la{" "}
                            <Link href="/legal/privacidad" target="_blank" className="underline">
                                Política de Privacidad
                            </Link>
                            .
                        </p>
                    </div>
                </div>
            )}
        </div>

    );
}
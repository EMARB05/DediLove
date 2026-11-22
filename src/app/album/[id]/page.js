"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  Lock,
  LockOpen,
  KeyRound,
  Heart,
  Calendar,
  Play,
  Pause,
  ZoomIn,
  MousePointerClick,
  ShieldCheck,
  FileText,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { db } from "@/lib/firebase";
import BottomNav from "@/components/BottomNav";

const ALBUM_DEMO_ELENA = {
  titulo: "Siete Años de Magia Silenciosa",
  etiqueta: "Recuerdo de 7 Años",
  fecha: "14 de octubre",
  destinatario: "Elena",
  autor: "Julián",
  contrasena: "",
  esDemo: true,
  carta:
    "Cada fotografía de este álbum es un capítulo secreto que solo compartimos nosotros: desde las zapatillas empapadas en Kioto hasta el té de medianoche en nuestra primera cocina. Gracias por hacer que los días comunes parezcan poesía.",
  fraseExtra: {
    original: "「ふたりだけの思い出」",
    traduccion: "Futari dake no omoide • Recuerdos solo para nosotros",
  },
  cancion: {
    titulo: "Nuestra Canción (Acústico)",
    duracion: "3:24",
  },
  vistasPrivadas: 84,
  fotos: [
    {
      id: "f1",
      codigo: "01",
      titulo: "Noche de Cerezos en Kioto",
      subtitulo: "Bajo las ramas en flor, haciendo nuestra promesa.",
      url: "",
      tono: "from-[#f8d7da] via-[#fbc4ab] to-[#ffdcc3]",
      alto: "h-60",
      polaroid: false,
    },
    {
      id: "f2",
      codigo: "02",
      titulo: "Cafés de Domingo",
      subtitulo: "Mañanas tranquilas antes de que despierte la ciudad.",
      url: "",
      tono: "from-[#e6ccb2] via-[#ddb892] to-[#f5ebe0]",
      alto: "h-44",
      polaroid: false,
    },
    {
      id: "f3",
      codigo: "03",
      titulo: "La Primera Nota",
      subtitulo: "Escrita en servilletas de café, guardada para siempre.",
      url: "",
      tono: "from-[#fde2e4] via-[#fad2e1] to-[#fff1e6]",
      alto: "h-48",
      polaroid: true,
    },
    {
      id: "f4",
      codigo: "04",
      titulo: "Brisa en el Acantilado",
      subtitulo: "Aire fresco y el atardecer reflejado en el mar.",
      url: "",
      tono: "from-[#ffd6a5] via-[#fdffb6]/50 to-[#ffadad]",
      alto: "h-64",
      polaroid: false,
    },
  ],
};

export default function AlbumPrivadoPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [album, setAlbum] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [reproduciendo, setReproduciendo] = useState(false);
  const [dioLike, setDioLike] = useState(false);
  const [indiceFoto, setIndiceFoto] = useState(null);
  const [notaEnviada, setNotaEnviada] = useState(false);

  useEffect(() => {
    async function cargarAlbum() {
      if (!albumId) return;
      setCargando(true);

      if (albumId === "elena-vault" || albumId === "demo") {
        setAlbum(ALBUM_DEMO_ELENA);
        setCargando(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "dedicatorias", albumId));
        if (snap.exists()) {
          const data = snap.data();
          const fotosRaw = data.albumPrivado?.fotos || [];
          setAlbum({
            titulo: `Álbum para ${data.destinatario || "Alguien especial"}`,
            etiqueta: data.categoria || "Álbum Privado",
            fecha: "Recuerdo guardado",
            destinatario: data.destinatario || "Destinatario",
            autor: data.remitente || "Anónimo",
            contrasena: data.albumPrivado?.contrasena || "",
            esDemo: false,
            carta: data.mensaje || "",
            fraseExtra: null,
            cancion: null,
            vistasPrivadas: data.likes || 1,
            fotos: fotosRaw.map((f, idx) => ({
              id: f.id || `foto-${idx}`,
              codigo: String(idx + 1).padStart(2, "0"),
              titulo: f.titulo || `Recuerdo ${idx + 1}`,
              subtitulo: `Momento privado compartido por ${data.remitente || "el autor"}.`,
              url: f.url || "",
              tono: "from-[#ffdada] via-[#ffe5ec] to-[#ffdcc3]",
              alto: idx % 2 === 0 ? "h-56" : "h-44",
              polaroid: idx % 3 === 2,
            })),
          });
        } else {
          setAlbum(null);
        }
      } catch (err) {
        console.error("Error cargando álbum:", err);
        setAlbum(null);
      } finally {
        setCargando(false);
      }
    }

    cargarAlbum();
  }, [albumId]);

  const manejarDesbloqueo = (e) => {
    e.preventDefault();
    if (!album) return;

    if (album.esDemo) {
      if (!codigoIngresado.trim()) {
        setErrorCodigo("Escribe cualquier clave de prueba para abrir el álbum demo.");
        return;
      }
      setErrorCodigo("");
      setDesbloqueado(true);
      return;
    }

    if (codigoIngresado.trim() !== (album.contrasena || "").trim()) {
      setErrorCodigo("La contraseña no coincide. Inténtalo de nuevo.");
      return;
    }

    setErrorCodigo("");
    setDesbloqueado(true);
  };

  const abrirLightbox = (index) => setIndiceFoto(index);
  const cerrarLightbox = () => setIndiceFoto(null);

  const fotoAnterior = () => {
    if (!album?.fotos?.length || indiceFoto === null) return;
    setIndiceFoto((prev) => (prev - 1 + album.fotos.length) % album.fotos.length);
  };

  const fotoSiguiente = () => {
    if (!album?.fotos?.length || indiceFoto === null) return;
    setIndiceFoto((prev) => (prev + 1) % album.fotos.length);
  };

  const enviarNotaRapida = () => {
    setNotaEnviada(true);
    setTimeout(() => setNotaEnviada(false), 2400);
  };

  const fotoActiva =
    indiceFoto !== null && album?.fotos?.[indiceFoto]
      ? album.fotos[indiceFoto]
      : null;
  const totalLikes = (album?.vistasPrivadas || 0) + (dioLike ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-28 max-w-2xl mx-auto px-5 flex flex-col justify-between pb-2">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Volver"
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <Heart className="w-4 h-4 fill-primary" />
              </div>
              <span className="font-serif text-[22px] leading-[30px] text-primary font-semibold tracking-tight">
                DediLove
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/crear"
                className="inline-flex items-center justify-center gap-1 h-10 px-4 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-[0_4px_16px_rgba(225,29,72,0.2)] hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Dedicar</span>
              </Link>

              <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-serif text-xs font-bold flex items-center justify-center ring-2 ring-primary-fixed/70">
                DL
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 py-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary-container text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al muro</span>
            </Link>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              {desbloqueado ? (
                <LockOpen className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              <span>Álbum Privado</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto pt-32 pb-28 px-5">
        {cargando ? (
          <div className="my-8 bg-surface-container-lowest rounded-3xl p-6 text-center text-sm text-on-surface-variant">
            Cargando información del álbum...
          </div>
        ) : !album ? (
          <div className="my-8 bg-surface-container-lowest rounded-3xl p-6 text-center flex flex-col items-center gap-3">
            <h1 className="font-serif text-2xl text-on-surface">
              Álbum no encontrado
            </h1>
            <p className="text-sm text-on-surface-variant">
              Es posible que el enlace no exista o se haya eliminado.
            </p>
            <Link
              href="/"
              className="px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-semibold"
            >
              Ir al muro principal
            </Link>
          </div>
        ) : !desbloqueado ? (
          <div className="my-4 bg-surface-container-lowest rounded-3xl p-6 shadow-[0_8px_28px_rgba(100,40,50,0.06)] flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-primary-fixed/35 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-secondary" />
                <span>Acceso Protegido</span>
              </span>
              <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                {album.fotos.length} fotos
              </span>
            </div>

            <div className="relative z-10">
              <h1 className="font-serif text-[28px] leading-[36px] text-on-surface font-medium">
                {album.titulo}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5">
                Dedicatoria de{" "}
                <span className="font-semibold text-primary">{album.autor}</span>{" "}
                para{" "}
                <span className="font-semibold text-on-surface">
                  {album.destinatario}
                </span>
                . Ingresa la contraseña secreta para abrir las fotos.
              </p>
            </div>

            <form
              onSubmit={manejarDesbloqueo}
              className="flex flex-col gap-3 relative z-10"
            >
              <label
                htmlFor="unlockPasscode"
                className="text-[11px] font-bold uppercase tracking-wider text-outline"
              >
                Contraseña del álbum
              </label>

              <div className="flex items-center gap-2 bg-surface-container-low px-4 py-3 rounded-full">
                <KeyRound className="w-4 h-4 text-primary shrink-0" />
                <input
                  id="unlockPasscode"
                  type="password"
                  value={codigoIngresado}
                  onChange={(e) => setCodigoIngresado(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="bg-transparent border-0 outline-none text-sm text-on-surface w-full tracking-wider"
                />
              </div>

              {errorCodigo && (
                <p className="text-xs text-error font-medium px-1">
                  {errorCodigo}
                </p>
              )}

              <button
                type="submit"
                className="mt-1 w-full py-3.5 px-5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-bold shadow-[0_6px_18px_rgba(225,29,72,0.25)] transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <LockOpen className="w-4 h-4" />
                <span>Desbloquear álbum</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col w-full space-y-6 pb-8">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-container-low shadow-[0_2px_12px_rgba(100,40,50,0.03)]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm text-on-surface-variant font-medium truncate">
                  Desbloqueado • Vista privada
                </span>
              </div>
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider shrink-0">
                Verificado
              </span>
            </div>

            <article className="relative bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(100,40,50,0.06)] overflow-hidden">
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">
                    {album.etiqueta}
                  </span>
                  <span className="text-xs text-outline flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{album.fecha}</span>
                  </span>
                </div>

                <h1 className="font-serif text-[28px] leading-[36px] text-on-surface font-medium">
                  {album.titulo}
                </h1>

                <p className="text-xs text-primary font-semibold tracking-wide">
                  Dedicado con todo el cariño para {album.destinatario}
                </p>

                <div className="bg-surface-container-low/75 rounded-2xl p-4 mt-1">
                  <p className="font-serif text-[18px] sm:text-[20px] leading-[31px] text-on-surface-variant italic">
                    “{album.carta}”
                  </p>
                  {album.fraseExtra && (
                    <p className="mt-2.5 text-right text-xs text-outline">
                      {album.fraseExtra.original} • {album.fraseExtra.traduccion}
                    </p>
                  )}
                </div>

                {album.cancion && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-full bg-surface-container-low">
                    <button
                      type="button"
                      aria-label={
                        reproduciendo ? "Pausar audio" : "Reproducir audio"
                      }
                      onClick={() => setReproduciendo((prev) => !prev)}
                      className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0"
                    >
                      {reproduciendo ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between text-on-surface">
                        <span className="text-xs font-semibold truncate">
                          {album.cancion.titulo}
                        </span>
                        <span className="text-[11px] font-bold text-outline ml-2 whitespace-nowrap">
                          {album.cancion.duracion}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <h2 className="font-serif text-[22px] leading-[30px] text-on-surface font-semibold">
                  Galería de Recuerdos
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  {album.fotos.length} momentos guardados por {album.autor}
                </p>
              </div>

              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider shrink-0">
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Toca para ampliar</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {album.fotos.map((foto, index) => (
                <div
                  key={foto.id}
                  onClick={() => abrirLightbox(index)}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
                    foto.polaroid
                      ? "bg-surface-container-lowest p-2 shadow-[0_4px_16px_rgba(100,40,50,0.05)] flex flex-col justify-between"
                      : "bg-surface-container shadow-[0_4px_16px_rgba(100,40,50,0.05)]"
                  }`}
                >
                  <div
                    className={`${foto.alto} w-full overflow-hidden ${
                      foto.polaroid ? "rounded-xl" : ""
                    } bg-gradient-to-br ${foto.tono} relative flex items-center justify-center`}
                  >
                    {foto.url ? (
                      <img
                        src={foto.url}
                        alt={foto.titulo}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Heart className="w-10 h-10 text-white/45 fill-white/30 transition-transform duration-500 group-hover:scale-105" />
                    )}
                  </div>

                  {foto.polaroid ? (
                    <div className="pt-2 px-1 flex items-center justify-between text-on-surface gap-1">
                      <p className="font-serif text-xs text-on-surface-variant italic truncate">
                        {foto.titulo}
                      </p>
                      <span className="text-[10px] font-bold text-primary whitespace-nowrap">
                        {foto.codigo} / {String(album.fotos.length).padStart(2, "0")}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-3 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/85 whitespace-nowrap">
                          {foto.codigo} / {String(album.fotos.length).padStart(2, "0")}
                        </span>
                        <ZoomIn className="w-4 h-4 text-white/90" />
                      </div>
                      <p className="text-xs font-semibold text-white truncate mt-0.5">
                        {foto.titulo}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-[0_6px_20px_rgba(100,40,50,0.04)] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDioLike((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all ${
                      dioLike
                        ? "bg-primary text-on-primary"
                        : "bg-primary-fixed text-on-primary-fixed"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        dioLike ? "fill-current" : "text-primary fill-primary"
                      }`}
                    />
                    <span>{totalLikes}</span>
                  </button>
                  <span className="text-xs text-on-surface-variant">
                    Visitas privadas
                  </span>
                </div>

                <div className="flex items-center gap-1 text-secondary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Espacio Privado</span>
                </div>
              </div>

              {notaEnviada && (
                <p className="text-xs text-primary font-semibold bg-primary-fixed/50 px-3.5 py-2 rounded-xl">
                  ¡Tu respuesta de cariño se guardó para {album.autor}!
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors active:scale-98"
                >
                  <FileText className="w-4 h-4" />
                  <span>Guardar / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={enviarNotaRapida}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] hover:opacity-95 transition-opacity active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar nota</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {fotoActiva && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4">
            <div className="flex items-center justify-between text-white pt-safe max-w-lg w-full mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                {fotoActiva.codigo} / {String(album.fotos.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label="Cerrar visor"
                onClick={cerrarLightbox}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
              <div className="relative max-w-sm w-full bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl p-2.5">
                <div
                  className={`w-full h-80 rounded-2xl overflow-hidden bg-gradient-to-br ${fotoActiva.tono} flex items-center justify-center`}
                >
                  {fotoActiva.url ? (
                    <img
                      src={fotoActiva.url}
                      alt={fotoActiva.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Heart className="w-16 h-16 text-white/50 fill-white/35" />
                  )}
                </div>
                <div className="p-3.5 text-center">
                  <h3 className="font-serif text-[20px] leading-[28px] text-on-surface font-semibold">
                    {fotoActiva.titulo}
                  </h3>
                  <p className="font-serif text-sm text-on-surface-variant italic mt-1">
                    “{fotoActiva.subtitulo}”
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pb-safe text-white">
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={fotoAnterior}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                onClick={fotoSiguiente}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
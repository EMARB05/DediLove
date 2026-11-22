"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
    id: "rose-silk",
    nombre: "Seda Rosa",
    colorCirculo: "bg-[#FAF0E6]",
    colorIcono: "text-primary",
    fondoTarjeta: "bg-surface-container-lowest",
  },
  {
    id: "gold-foil",
    nombre: "Pan de Oro",
    colorCirculo: "bg-[#FEF3C7]",
    colorIcono: "text-secondary",
    fondoTarjeta: "bg-[#FFFDF7]",
  },
  {
    id: "stardust",
    nombre: "Estelar",
    colorCirculo: "bg-[#F3E8FF]",
    colorIcono: "text-tertiary",
    fondoTarjeta: "bg-[#FDFBFF]",
  },
  {
    id: "velvet",
    nombre: "Terciopelo",
    colorCirculo: "bg-[#FFE4E6]",
    colorIcono: "text-primary",
    fondoTarjeta: "bg-[#FFF8F9]",
  },
];

const MAX_FOTOS = 20;

export default function EditorDedicatoriaPage() {
  const router = useRouter();
  const inputFotosRef = useRef(null);

  const [destinatario, setDestinatario] = useState("");
  const [categoria, setCategoria] = useState("Amor");
  const [mensaje, setMensaje] = useState("");
  const [remitente, setRemitente] = useState("");
  const [estiloTipografia, setEstiloTipografia] = useState(
    ESTILOS_TIPOGRAFIA[0]
  );
  const [acabadoPapel, setAcabadoPapel] = useState(ACABADOS_PAPEL[0]);
  const [albumActivo, setAlbumActivo] = useState(false);

  // Cada foto puede ser { id, titulo, previewUrl, file }
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [estadoPublicacion, setEstadoPublicacion] = useState("idle"); // idle | saving | saved
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [avisoBorrador, setAvisoBorrador] = useState(false);

  const limiteCaracteres = 500;

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
      titulo: file.name.replace(/\.[^/.]+$/, "") || `Recuerdo ${fotosSeleccionadas.length + idx + 1}`,
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

    if (albumActivo && fotosSeleccionadas.length > 0 && !contrasena.trim()) {
      setErrorForm("Define una contraseña secreta para proteger el álbum privado.");
      return;
    }

    try {
      setEstadoPublicacion("saving");
      let fotosSubidas = [];

      if (albumActivo && fotosSeleccionadas.length > 0) {
        for (let i = 0; i < fotosSeleccionadas.length; i++) {
          const foto = fotosSeleccionadas[i];
          setMensajeEstado(
            `Comprimiendo y subiendo foto ${i + 1} de ${fotosSeleccionadas.length}...`
          );
          const urlSegura = await comprimirYSubirImagen(foto.file);
          fotosSubidas.push({
            id: foto.id,
            titulo: foto.titulo,
            url: urlSegura,
            orden: i + 1,
          });
        }
      }

      setMensajeEstado("Guardando dedicatoria en Firestore...");

      const esDestacada =
        estiloTipografia.id !== "editorial" ||
        acabadoPapel.id !== "rose-silk" ||
        (albumActivo && fotosSubidas.length > 0);

      const nuevaDedicatoria = {
        destinatario: destinatario.trim(),
        subtitulo: "",
        categoria,
        etiqueta: esDestacada ? "Destacada" : categoria,
        destacada: esDestacada,
        mensaje: mensaje.trim(),
        remitente: remitente.trim() || "Anónimo",
        despedida: "Con cariño",
        ubicacion: "Publicado en DediLove",
        estiloTipografia: estiloTipografia.id,
        acabadoPapel: acabadoPapel.id,
        likes: 0,
        comentarios: 0,
        albumPrivado:
          albumActivo && fotosSubidas.length > 0
            ? {
                activo: true,
                contrasena: contrasena.trim(),
                totalFotos: fotosSubidas.length,
                limiteMaximo: MAX_FOTOS,
                fotos: fotosSubidas,
              }
            : null,
        creadoEn: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "dedicatorias"), nuevaDedicatoria);

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
        err?.message || "No se pudo guardar la dedicatoria. Revisa tu configuración."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Input oculto para elegir fotos */}
      <input
        ref={inputFotosRef}
        type="file"
        accept="image/*"
        multiple
        onChange={manejarSeleccionFotos}
        className="hidden"
      />

      {/* Encabezado superior fijo */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-2xl mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Volver"
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
              <Heart className="w-3.5 h-3.5 fill-primary" />
            </div>
            <h1 className="font-serif text-[20px] leading-[28px] text-on-surface font-semibold">
              Editor de Dedicatoria
            </h1>
          </div>

          <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-serif text-xs font-bold flex items-center justify-center ring-2 ring-primary-fixed/70">
            DL
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-2xl mx-auto pt-20 pb-28 px-5">
        {/* Cinta de estado */}
        <div className="flex items-center justify-between py-1.5 mb-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              {estadoPublicacion === "saving" && mensajeEstado
                ? mensajeEstado
                : avisoBorrador
                ? "Borrador guardado"
                : "Edición en curso"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold">Edición Especial</span>
          </div>
        </div>

        {/* Subencabezado editorial */}
        <div className="mb-5">
          <h2 className="font-serif text-[28px] leading-[36px] text-on-surface font-medium">
            Escribe una dedicatoria
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
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
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs flex flex-col gap-2">
            <label
              htmlFor="recipientInput"
              className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center justify-between"
            >
              <span>Para: Destinatario</span>
              <span className="text-primary font-medium normal-case">
                Obligatorio
              </span>
            </label>
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-on-surface-variant shrink-0" />
              <input
                id="recipientInput"
                type="text"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="¿Para quién es esta dedicatoria? Ej. Elena, Mamá..."
                className="w-full bg-transparent border-0 outline-none text-base sm:text-lg text-on-surface placeholder:text-on-surface-variant/45"
              />
            </div>
          </div>

          {/* Categorías */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
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
                    className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 shrink-0 ${
                      activa
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
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
            className={`${acabadoPapel.fondoTarjeta} rounded-2xl p-5 shadow-md flex flex-col relative overflow-hidden transition-colors`}
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
                className={`w-full bg-transparent border-0 outline-none text-[19px] leading-[32px] text-on-surface placeholder:text-on-surface-variant/45 resize-none ${estiloTipografia.claseTexto}`}
              />
            </div>

            {/* Indicador de fuente y contador */}
            <div className="flex items-center justify-between pt-2 mt-1 text-on-surface-variant relative z-10">
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
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs flex flex-col gap-2">
            <label
              htmlFor="senderInput"
              className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center justify-between"
            >
              <span>De: Tu firma</span>
              <span className="text-on-surface-variant font-normal normal-case">
                Visible en el muro
              </span>
            </label>
            <div className="flex items-center gap-2.5">
              <PenTool className="w-5 h-5 text-secondary shrink-0" />
              <input
                id="senderInput"
                type="text"
                value={remitente}
                onChange={(e) => setRemitente(e.target.value)}
                placeholder="Tu nombre o apodo (ej. Julián, Anónimo)"
                className="w-full bg-transparent border-0 outline-none text-base sm:text-lg text-on-surface placeholder:text-on-surface-variant/45"
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
                    Edición Destacada
                  </span>
                </div>
                <h3 className="font-serif text-[22px] leading-[28px] text-on-surface font-semibold mt-0.5">
                  Recuerdo Premium
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                  Destaca tu carta, personaliza estilos y adjunta un álbum privado de hasta 20 fotos.
                </p>
              </div>

              <div className="px-3 py-1 rounded-full bg-secondary text-on-secondary text-xs font-bold shadow-xs whitespace-nowrap shrink-0">
                $2.99
              </div>
            </div>

            {/* Selector de tipografía */}
            <div className="flex flex-col gap-2 bg-surface-container-lowest/85 backdrop-blur-md p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Estilo de letra
              </span>
              <div className="grid grid-cols-3 gap-2">
                {ESTILOS_TIPOGRAFIA.map((opcion) => {
                  const activa = estiloTipografia.id === opcion.id;
                  return (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => setEstiloTipografia(opcion)}
                      className={`p-2.5 rounded-xl flex flex-col items-center justify-center shadow-2xs text-center transition-all ${
                        activa
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          opcion.id === "romana"
                            ? "font-serif italic"
                            : opcion.id === "editorial"
                            ? "font-serif"
                            : "font-sans font-semibold"
                        }`}
                      >
                        {opcion.nombre}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                        {opcion.subtitulo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de acabado */}
            <div className="flex flex-col gap-2 bg-surface-container-lowest/85 backdrop-blur-md p-3.5 rounded-2xl shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
                Tono y acabado
              </span>
              <div className="grid grid-cols-4 gap-2">
                {ACABADOS_PAPEL.map((acabado) => {
                  const seleccionado = acabadoPapel.id === acabado.id;
                  return (
                    <button
                      key={acabado.id}
                      type="button"
                      onClick={() => setAcabadoPapel(acabado)}
                      className="flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${
                          acabado.colorCirculo
                        } shadow-xs flex items-center justify-center ${
                          acabado.colorIcono
                        } transition-transform group-hover:scale-105 ${
                          seleccionado ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        {seleccionado ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Heart className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider text-center ${
                          seleccionado
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

            {/* Módulo de Álbum Privado (hasta 20 fotos) */}
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
                  onClick={() => setAlbumActivo((prev) => !prev)}
                  className={`w-12 h-6 rounded-full p-0.5 flex items-center transition-colors shrink-0 ${
                    albumActivo
                      ? "bg-primary justify-end"
                      : "bg-surface-container-highest justify-start"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-on-primary shadow-sm" />
                </button>
              </div>

              {albumActivo && (
                <>
                  {/* Tira de fotos */}
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1.5 no-scrollbar">
                    {fotosSeleccionadas.map((foto) => (
                      <div
                        key={foto.id}
                        className="relative shrink-0 w-20 h-24 bg-surface-container-low p-1 rounded-md shadow-xs flex flex-col items-center justify-between"
                      >
                        <button
                          type="button"
                          aria-label={`Quitar ${foto.titulo}`}
                          onClick={() => eliminarFoto(foto.id)}
                          className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center self-end hover:bg-primary transition-colors z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <img
                          src={foto.previewUrl}
                          alt={foto.titulo}
                          className="w-full h-12 rounded-xs object-cover"
                        />
                        <span className="text-[10px] font-semibold text-on-surface-variant truncate w-full text-center">
                          {foto.titulo}
                        </span>
                      </div>
                    ))}

                    {fotosSeleccionadas.length < MAX_FOTOS && (
                      <button
                        type="button"
                        onClick={abrirSelectorFotos}
                        className="shrink-0 w-20 h-24 rounded-md bg-surface-container hover:bg-surface-container-high flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xs transition-colors text-center px-1"
                      >
                        <ImagePlus className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-bold uppercase text-on-surface">
                          + Añadir
                        </span>
                        <span className="text-[10px] font-semibold text-outline whitespace-nowrap">
                          {fotosSeleccionadas.length} / {MAX_FOTOS}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Contraseña secreta */}
                  <div className="pt-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="secretCode"
                        className="text-[11px] font-bold uppercase tracking-wider text-outline flex items-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        <span>Contraseña secreta</span>
                      </label>
                      <span className="text-[10px] font-bold uppercase text-secondary">
                        Privado
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-surface-container px-3.5 py-2 rounded-full">
                      <KeyRound className="w-4 h-4 text-on-surface-variant shrink-0" />
                      <input
                        id="secretCode"
                        type={mostrarContrasena ? "text" : "password"}
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        placeholder="Escribe una clave para el álbum"
                        className="bg-transparent border-0 outline-none text-sm text-on-surface w-full tracking-widest placeholder:tracking-normal placeholder:text-on-surface-variant/45"
                      />
                      <button
                        type="button"
                        aria-label="Mostrar u ocultar contraseña"
                        onClick={() => setMostrarContrasena((prev) => !prev)}
                        className="text-on-surface-variant hover:text-primary transition-colors"
                      >
                        {mostrarContrasena ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Solo quienes tengan esta contraseña podrán ver las fotos del álbum privado.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Barra inferior fija de acciones */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl px-5 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
        <div className="flex items-center gap-3 max-w-2xl mx-auto w-full">
          <button
            type="button"
            onClick={guardarBorrador}
            className="w-1/3 py-3 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs sm:text-sm font-semibold shadow-2xs transition-transform active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Bookmark className="w-4 h-4" />
            <span>Borrador</span>
          </button>

          <button
            type="button"
            onClick={publicarDedicatoria}
            disabled={estadoPublicacion === "saving"}
            className="flex-1 py-3 px-6 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75"
          >
            {estadoPublicacion === "saving" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mensajeEstado || "Guardando..."}</span>
              </>
            )}
            {estadoPublicacion === "saved" && (
              <>
                <Heart className="w-4 h-4 fill-current" />
                <span>¡Dedicatoria lista!</span>
              </>
            )}
            {estadoPublicacion === "idle" && (
              <>
                <span>Publicar dedicatoria</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
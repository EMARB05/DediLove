"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESTILOS_TEXTO, FONDOS_PAPEL } from "../lib/estilos";
import {
  collection,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  doc,
  increment,
  where,
  limit
} from "firebase/firestore";
import {
  Heart,
  Sparkles,
  Lock,
  LockOpen,
  KeyRound,
  Share2,
  Bookmark,
  MessageCircle,
  Users,
  Cake,
  Plus,
  Music,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const DEDICATORIAS_DEMO = [
  {
    id: "elena-vault",
    esDemo: true,
    destinatario: "Elena",
    subtitulo: "Mi Estrella del Norte",
    categoria: "Amor",
    etiqueta: "Destacada",
    destacada: true,
    musica: "Clair de Lune",
    tiempo: "Hace 2 h",
    mensaje:
      "En cada atardecer tranquilo y en cada tormenta, tu risa ha sido mi refugio. Siete años, y aún se siente como nuestro primer amanecer.",
    fraseExtra: {
      original: "「愛してる、永遠に」",
      traduccion: "Aishiteru, eien ni — Te amo, por toda la eternidad",
    },
    albumPrivado: {
      totalFotos: 18,
      desbloqueado: false,
      autorAlbum: "Julián",
      ruta: "/album/elena-vault",
    },
    remitente: "Julián",
    despedida: "Siempre tuyo",
    ubicacion: "Archivado en París",
    likes: 1248,
    comentarios: 64,
    avatarColor: "bg-primary-fixed text-primary",
  },
  {
    id: "maya-chloe",
    esDemo: true,
    destinatario: "Maya y Chloe",
    subtitulo: "",
    categoria: "Amistad",
    etiqueta: "Amistad",
    destacada: false,
    musica: "",
    tiempo: "Hace 4 h",
    mensaje:
      "Gracias por sentarse conmigo en el suelo cuando todo pesaba demasiado y pedir pizza hasta volver a reír. Ustedes definen lo que es un alma gemela.",
    fraseExtra: null,
    albumPrivado: null,
    remitente: "Sofía",
    despedida: "Con cariño",
    ubicacion: "Recuerdos de 2024",
    likes: 342,
    comentarios: 28,
    avatarColor: "bg-secondary-fixed-dim text-on-secondary-fixed",
  },
];

function tiempoRelativo(timestamp) {
  if (!timestamp?.toDate) return "Ahora";
  const fecha = timestamp.toDate();
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);

  if (seg < 60) return "Ahora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? "Hace 1 día" : `Hace ${dias} días`;

  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const CATEGORIAS = [
  { id: "Todas", label: "Todas" },
  { id: "Amor", label: "Amor" },
  { id: "Amistad", label: "Amistad" },
  { id: "Familia", label: "Familia" },
  { id: "Agradecimiento", label: "Agradecimiento" },
];

export default function MuroPublicoPage() {
  const [dedicatorias, setDedicatorias] = useState(DEDICATORIAS_DEMO);
  const { user, loading } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [likesDados, setLikesDados] = useState({});
  const [guardados, setGuardados] = useState({});
  const router = useRouter();
  const likesEnCurso = useRef(new Set());


  useEffect(() => {
    async function cargarDedicatorias() {
      try {
        const q = query(
          collection(db, "dedicatorias"),
          where("publica", "==", true),
          orderBy("creadoEn", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const reales = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              esDemo: false,
              destinatario: data.destinatario || "Alguien especial",
              subtitulo: data.subtitulo || "",
              categoria: data.categoria || "Amor",
              etiqueta: data.etiqueta || data.categoria || "Dedicatoria",
              destacada: Boolean(data.destacada),
              musica: data.musica || "",
              tiempo: tiempoRelativo(data.creadoEn),
              mensaje: data.mensaje || "",
              fraseExtra: data.fraseExtra || null,
              albumPrivado: data.albumPrivado?.activo
                ? {
                  totalFotos:
                    data.albumPrivado.totalFotos ||
                    data.albumPrivado.fotos?.length ||
                    0,
                  desbloqueado: false,
                  autorAlbum: data.remitente || "Autor",
                  ruta: `/album/${d.id}`,
                }
                : null,
              remitente: data.remitente || "Anónimo",
              despedida: data.despedida || "Con cariño",
              ubicacion: data.ubicacion || "DediLove",
              likes: typeof data.likes === "number" ? data.likes : 0,
              comentarios:
                typeof data.comentarios === "number" ? data.comentarios : 0,
              avatarColor: "bg-primary-fixed text-primary",
              estiloTipografia: data.estiloTipografia || "editorial",
              acabadoPapel: data.acabadoPapel || "rose-silk",
            };
          });
          const realesOrdenadas = [...reales].sort(
            (a, b) => Number(b.destacada) - Number(a.destacada)
          );
          setDedicatorias([...realesOrdenadas, ...DEDICATORIAS_DEMO]);
        }
      } catch (err) {
        console.error("Error cargando dedicatorias de Firestore:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarDedicatorias();
  }, []);

  useEffect(() => {
    if (!user) {
      setLikesDados({});
      return;
    }
    const reales = dedicatorias.filter((d) => !d.esDemo);
    if (!reales.length) return;

    Promise.all(
      reales.map((d) => getDoc(doc(db, "dedicatorias", d.id, "likes", user.uid)))
    )
      .then((snaps) => {
        const mapa = {};
        snaps.forEach((s, i) => {
          if (s.exists()) mapa[reales[i].id] = true;
        });
        setLikesDados(mapa);
      })
      .catch(console.error);
  }, [user, dedicatorias.length]);

  //efecto que carga lo que ya he guardado
  useEffect(() => {
  if (!user) {
    setGuardados({});
    return;
  }
  getDocs(collection(db, "users", user.uid, "guardadas"))
    .then((snap) => {
      const mapa = {};
      snap.forEach((d) => {
        mapa[d.id] = true;
      });
      setGuardados(mapa);
    })
    .catch(console.error);
}, [user]);


  const dedicatoriasFiltradas =
    categoriaActiva === "Todas"
      ? dedicatorias
      : dedicatorias.filter((item) => item.categoria === categoriaActiva);

  const toggleLike = async (item) => {
    if (!user) {
      router.push("/perfil");
      return;
    }
    if (likesEnCurso.current.has(item.id)) return; // evita doble toque

    const yaDado = Boolean(likesDados[item.id]);
    const delta = yaDado ? -1 : 1;

    const aplicar = (d) =>
      setDedicatorias((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, likes: x.likes + d } : x))
      );

    // Actualización inmediata en pantalla
    setLikesDados((prev) => ({ ...prev, [item.id]: !yaDado }));
    aplicar(delta);

    if (item.esDemo) return; // las demo solo viven en local

    likesEnCurso.current.add(item.id);
    try {
      const dedRef = doc(db, "dedicatorias", item.id);
      const likeRef = doc(db, "dedicatorias", item.id, "likes", user.uid);
      const batch = writeBatch(db);

      if (yaDado) {
        batch.delete(likeRef);
      } else {
        batch.set(likeRef, { creadoEn: serverTimestamp() });
      }
      batch.update(dedRef, { likes: increment(delta) });

      await batch.commit();
    } catch (err) {
      console.error("Error actualizando like:", err);
      // Si falla, deshacemos el cambio visual
      setLikesDados((prev) => ({ ...prev, [item.id]: yaDado }));
      aplicar(-delta);
    } finally {
      likesEnCurso.current.delete(item.id);
    }
  };

  const toggleGuardar = async (item) => {
  if (!user) {
    router.push("/perfil");
    return;
  }

  const yaGuardado = Boolean(guardados[item.id]);
  setGuardados((prev) => ({ ...prev, [item.id]: !yaGuardado }));

  if (item.esDemo) return; // las demo solo viven en local

  try {
    const ref = doc(db, "users", user.uid, "guardadas", item.id);
    if (yaGuardado) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { guardadoEn: serverTimestamp() });
    }
  } catch (err) {
    console.error("Error al guardar:", err);
    setGuardados((prev) => ({ ...prev, [item.id]: yaGuardado }));
  }
};

  const renderBadgeIcon = (categoria) => {
    if (categoria === "Amistad") return <Users className="w-3.5 h-3.5" />;
    if (categoria === "Familia")
      return <Cake className="w-3.5 h-3.5 text-secondary" />;
    return <Heart className="w-3.5 h-3.5 text-primary fill-primary" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Encabezado fijo superior */}
      <header className="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-28 max-w-2xl mx-auto px-5 flex flex-col justify-between pb-2">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-xs">
                <Heart className="w-4 h-4 fill-primary" />
              </div>
              <span className="font-serif text-[22px] leading-[30px] text-primary font-semibold tracking-tight">
                DediLove
              </span>
            </Link>

            <div className="flex items-center gap-2.5">
              <Link
                href="/crear"
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-primary-container text-on-primary text-xs font-semibold tracking-wide shadow-[0_4px_16px_rgba(225,29,72,0.2)] hover:opacity-95 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Dedicar</span>
              </Link>

              <Link
                href="/perfil"
                aria-label="Mi perfil"
                className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-serif text-xs font-bold flex items-center justify-center ring-2 ring-primary-fixed/70"
              >
                {(user?.displayName || "D").charAt(0).toUpperCase()}
              </Link>
            </div>
          </div>

          {/* Barra superior de categorías */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CATEGORIAS.map((cat) => {
              const activa = categoriaActiva === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activa
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:text-primary"
                    }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-2xl mx-auto pt-32 pb-28 px-5">
        <div className="flex flex-col gap-6">
          {dedicatoriasFiltradas.map((item) => {
            const dioLike = Boolean(likesDados[item.id]);
            const fondo = FONDOS_PAPEL[item.acabadoPapel] || FONDOS_PAPEL["rose-silk"];
            const claseTexto = ESTILOS_TEXTO[item.estiloTipografia] || ESTILOS_TEXTO.editorial;
            const totalLikes = item.likes;
            const estaGuardado = Boolean(guardados[item.id]);

            return (
              <article
                key={item.id}
                className={`relative rounded-2xl ${fondo} p-5 sm:p-6 overflow-hidden transition-all duration-300 ${item.destacada
                  ? "shadow-[0_8px_30px_rgba(100,40,50,0.06)]"
                  : "shadow-[0_4px_20px_rgba(100,40,50,0.03)]"
                  }`}
              >
                {item.destacada && (
                  <>
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-secondary-fixed/40 via-primary-fixed/30 to-transparent rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary-container via-primary-container to-secondary-container opacity-80" />
                  </>
                )}

                <div className="flex items-center justify-between gap-2 mb-3.5 relative z-10">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${item.destacada
                      ? "bg-secondary-fixed text-on-secondary-fixed shadow-xs"
                      : "bg-primary-fixed/70 text-primary"
                      }`}
                  >
                    {item.destacada ? (
                      <Sparkles className="w-3.5 h-3.5 text-secondary" />
                    ) : (
                      renderBadgeIcon(item.categoria)
                    )}
                    <span>{item.etiqueta}</span>
                  </div>

                  <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                    {item.musica && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant">
                        <Music className="w-3 h-3 text-primary" />
                        <span>{item.musica}</span>
                      </span>
                    )}
                    <span className="text-[11px] opacity-75">{item.tiempo}</span>
                  </div>
                </div>

                <div className="mb-3 relative z-10">
                  {item.destacada && (
                    <p className="text-[11px] text-primary tracking-wider uppercase font-bold">
                      Dedicatoria para
                    </p>
                  )}
                  <h2 className="font-serif text-[22px] sm:text-[26px] leading-[32px] text-on-surface font-medium tracking-tight mt-0.5">
                    Para {item.destinatario}
                    {item.subtitulo && (
                      <span className="italic font-normal text-on-surface-variant text-lg sm:text-xl ml-1.5">
                        {item.subtitulo}
                      </span>
                    )}
                  </h2>
                </div>

                <div className="relative py-1.5 my-1 z-10">
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 -left-1 text-4xl font-serif text-primary/15 select-none"
                  >
                    “
                  </span>
                  <p className={`${claseTexto} text-[18px] sm:text-[20px] leading-[31px] text-on-surface pl-4`}>
                    {item.mensaje}
                  </p>
                </div>

                {item.fraseExtra && (
                  <div className="mt-3 mb-4 p-3 rounded-xl bg-surface-container-low/80 flex items-start gap-2.5 relative z-10">
                    <Heart className="w-4 h-4 text-primary fill-primary shrink-0 mt-1" />
                    <div className="min-w-0">
                      <p className="font-serif text-sm text-primary tracking-wide">
                        {item.fraseExtra.original}
                      </p>
                      <p className="text-xs text-on-surface-variant italic mt-0.5">
                        {item.fraseExtra.traduccion}
                      </p>
                    </div>
                  </div>
                )}

                {item.albumPrivado && (
                  <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-secondary-fixed/50 to-primary-fixed/40 flex items-center justify-between gap-2.5 shadow-xs relative z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-secondary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                        {item.albumPrivado.desbloqueado ? (
                          <LockOpen className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-on-background font-semibold">
                            Álbum Privado
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold whitespace-nowrap">
                            {item.albumPrivado.totalFotos} fotos
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                          Requiere contraseña de {item.albumPrivado.autorAlbum}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={item.albumPrivado.ruta}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary text-xs font-semibold shadow-xs hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </Link>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-xs font-bold shrink-0 ${item.avatarColor}`}
                    >
                      {item.remitente.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-on-surface font-medium truncate">
                        {item.despedida},{" "}
                        <span className="font-semibold text-primary">
                          {item.remitente}
                        </span>
                      </p>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                        {item.ubicacion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleLike(item)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-90 ${dioLike
                        ? "bg-primary text-on-primary shadow-xs"
                        : "bg-surface-container-low text-primary hover:bg-primary-fixed/60"
                        }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${dioLike ? "fill-current" : ""}`}
                      />
                      <span>{totalLikes.toLocaleString("es-ES")}</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Comentarios"
                      className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{item.comentarios}</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Compartir dedicatoria"
                      className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      aria-label="Guardar dedicatoria"
                      onClick={() => toggleGuardar(item)}
                      className={`w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center transition-colors ${estaGuardado
                        ? "text-secondary"
                        : "text-on-surface-variant hover:text-secondary"
                        }`}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${estaGuardado ? "fill-current" : ""
                          }`}
                      />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 mb-4 flex flex-col items-center justify-center text-center">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shadow-xs">
              <Heart className="w-5 h-5 fill-primary animate-bounce" />
            </div>
          </div>
          <p className="font-serif text-xs tracking-wide text-primary mt-3 font-medium">
            {cargando
              ? "Sincronizando dedicatorias..."
              : "Historias reales guardadas con cariño ♡"}
          </p>
          <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/70 mt-0.5">
            DediLove • Recuerdos vivos
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
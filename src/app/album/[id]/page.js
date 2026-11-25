"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { comprimirYSubirImagen } from "@/lib/cloudinary";
import { useTema } from "@/components/ProveedorTema";
import { BotonModoNoche } from "@/components/BotonModoNoche";
import logo from './../../../img/logo.png'
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useAuth } from "../../../context/AuthContext";
import { ImagePlus } from "lucide-react";
import {
    doc, getDoc, collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp
} from "firebase/firestore";
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
    Trash2
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

function construirFotos(fotosApi, autor) {
    return fotosApi.map((f, idx) => ({
        id: f.id,
        codigo: String(idx + 1).padStart(2, "0"),
        titulo: f.titulo?.trim() || `Recuerdo ${String(idx + 1).padStart(2, "0")}`,
        subtitulo:
            f.subtitulo?.trim() ||
            f.frase?.trim() ||
            `Momento privado compartido por ${autor || "el autor"}.`,
        url: f.url,
        puedeBorrar: Boolean(f.puedeBorrar),
        tono: "from-[#ffdada] via-[#ffe5ec] to-[#ffdcc3]",
        alto: idx % 2 === 0 ? "h-56" : "h-44",
        polaroid: idx % 3 === 2,
    }));
}

const MAX_NOTAS_ALBUM = 20;
async function cargarImagenComoDataUrl(url) {
    if (!url) return null;
    try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) return null;
        const blob = await res.blob();

        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

async function cargarImagenAjustada(url, maxAncho, maxAlto) {
    const dataUrl = await cargarImagenComoDataUrl(url);
    if (!dataUrl) return null;

    return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const natW = img.naturalWidth || img.width || 1;
            const natH = img.naturalHeight || img.height || 1;
            const ratio = Math.min(maxAncho / natW, maxAlto / natH, 1);

            resolve({
                dataUrl,
                ancho: Math.round(natW * ratio),
                alto: Math.round(natH * ratio),
            });
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });
}

function AlbumPrivadoContent() {
    const params = useParams();
    const router = useRouter();
    const albumId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const { modoNoche } = useTema();
    const [album, setAlbum] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [desbloqueado, setDesbloqueado] = useState(false);
    const [codigoIngresado, setCodigoIngresado] = useState("");
    const [errorCodigo, setErrorCodigo] = useState("");
    const [reproduciendo, setReproduciendo] = useState(false);
    const [dioLike, setDioLike] = useState(false);
    const [indiceFoto, setIndiceFoto] = useState(null);
    const [notaEnviada, setNotaEnviada] = useState(false);
    const { user } = useAuth();
    const [abriendo, setAbriendo] = useState(false);
    const claveRef = useRef("");
    const inputAportesRef = useRef(null);
    const [subiendo, setSubiendo] = useState(false);
    const [errorAporte, setErrorAporte] = useState("");
    // 1. Refs y estados extra dentro de AlbumPrivadoContent
    const inputFondoRef = useRef(null);
    const [subiendoFondo, setSubiendoFondo] = useState(false);
    // Estados nuevos dentro de AlbumPrivadoContent
    const [fraseNuevaFoto, setFraseNuevaFoto] = useState("");
    const [mostrarCajaNota, setMostrarCajaNota] = useState(false);
    const [textoNota, setTextoNota] = useState("");
    const [enviandoNota, setEnviandoNota] = useState(false);
    const [notasAlbum, setNotasAlbum] = useState([]);
    const [notasDesplegadas, setNotasDesplegadas] = useState(true);
    const [descargandoPdf, setDescargandoPdf] = useState(false);

    const descargarAlbumPdf = async () => {
        if (!album || descargandoPdf) return;
        setDescargandoPdf(true);

        try {
            const docPdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = docPdf.internal.pageSize.getWidth();
            const pageHeight = docPdf.internal.pageSize.getHeight();
            const margin = 48;
            const maxWidth = pageWidth - margin * 2;

            // Cargamos una sola vez el fondo personalizado del álbum si existe
            const fondoInfo = album.fondoUrl
                ? await cargarImagenAjustada(album.fondoUrl, pageWidth, pageHeight)
                : null;

            const COLOR_FONDO_RESPALDO = [255, 248, 246]; // #FFF8F6 si no hay fondoUrl
            const COLOR_TARJETA = [255, 255, 255];
            const COLOR_ACENTO = [219, 68, 102];
            const COLOR_BORDE = [242, 214, 221];
            const COLOR_TEXTO = [38, 28, 32];
            const COLOR_SUAVE = [125, 105, 112];

            const decorarPagina = (numPagina) => {
                // Base suave por si el fondo tiene transparencia o no existe
                docPdf.setFillColor(...COLOR_FONDO_RESPALDO);
                docPdf.rect(0, 0, pageWidth, pageHeight, "F");

                if (fondoInfo?.dataUrl) {
                    const formatoFondo = fondoInfo.dataUrl.includes("image/png") ? "PNG" : "JPEG";
                    const opacidadFondo = new docPdf.GState({ opacity: 0.18 });
                    const opacidadNormal = new docPdf.GState({ opacity: 1 });

                    docPdf.setGState(opacidadFondo);
                    // Cubre toda la hoja manteniendo proporción centrada
                    const escala = Math.max(pageWidth / fondoInfo.ancho, pageHeight / fondoInfo.alto);
                    const wFondo = fondoInfo.ancho * escala;
                    const hFondo = fondoInfo.alto * escala;
                    const xFondo = (pageWidth - wFondo) / 2;
                    const yFondo = (pageHeight - hFondo) / 2;

                    docPdf.addImage(
                        fondoInfo.dataUrl,
                        formatoFondo,
                        xFondo,
                        yFondo,
                        wFondo,
                        hFondo,
                        undefined,
                        "FAST"
                    );
                    docPdf.setGState(opacidadNormal);
                }

                // Marco interior fino
                docPdf.setDrawColor(...COLOR_BORDE);
                docPdf.setLineWidth(1);
                docPdf.roundedRect(24, 24, pageWidth - 48, pageHeight - 48, 14, 14, "S");

                // Pie de página
                docPdf.setFont("helvetica", "normal");
                docPdf.setFontSize(8.5);
                docPdf.setTextColor(...COLOR_SUAVE);
                docPdf.text(
                    `Dedilove  •  Recuerdo privado  •  Página ${numPagina}`,
                    pageWidth / 2,
                    pageHeight - 34,
                    { align: "center" }
                );
            };

            let paginaActual = 1;
            decorarPagina(paginaActual);
            let y = 76;

            const nuevaPaginaSiNoCabe = (altoNecesario) => {
                if (y + altoNecesario > pageHeight - 58) {
                    docPdf.addPage();
                    paginaActual += 1;
                    decorarPagina(paginaActual);
                    y = 58;
                }
            };

            // --- ENCABEZADO ---
            docPdf.setFont("helvetica", "bold");
            docPdf.setFontSize(9);
            docPdf.setTextColor(...COLOR_ACENTO);
            docPdf.text((album.etiqueta || "ÁLBUM PRIVADO").toUpperCase(), pageWidth / 2, y, {
                align: "center",
            });
            y += 26;

            docPdf.setFont("times", "bold");
            docPdf.setFontSize(24);
            docPdf.setTextColor(...COLOR_TEXTO);
            const tituloLineas = docPdf.splitTextToSize(album.titulo || "Álbum Privado", maxWidth);
            docPdf.text(tituloLineas, pageWidth / 2, y, { align: "center" });
            y += tituloLineas.length * 28 + 6;

            docPdf.setDrawColor(...COLOR_ACENTO);
            docPdf.setLineWidth(1.5);
            docPdf.line(pageWidth / 2 - 36, y, pageWidth / 2 + 36, y);
            y += 20;

            docPdf.setFont("helvetica", "normal");
            docPdf.setFontSize(10.5);
            docPdf.setTextColor(...COLOR_SUAVE);
            docPdf.text(
                `De ${album.autor || "Anónimo"} para ${album.destinatario || "Alguien especial"}`,
                pageWidth / 2,
                y,
                { align: "center" }
            );
            y += 30;

            // --- TARJETA DE DEDICATORIA ---
            if (album.carta?.trim()) {
                docPdf.setFont("times", "italic");
                docPdf.setFontSize(12);
                const lineasCarta = docPdf.splitTextToSize(album.carta.trim(), maxWidth - 48);
                const altoCaja = lineasCarta.length * 17 + 44;

                nuevaPaginaSiNoCabe(altoCaja + 16);

                docPdf.setFillColor(...COLOR_TARJETA);
                docPdf.setDrawColor(...COLOR_BORDE);
                docPdf.setLineWidth(1);
                docPdf.roundedRect(margin, y, maxWidth, altoCaja, 12, 12, "FD");

                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(8.5);
                docPdf.setTextColor(...COLOR_ACENTO);
                docPdf.text("DEDICATORIA", margin + 24, y + 20);

                docPdf.setFont("times", "italic");
                docPdf.setFontSize(12);
                docPdf.setTextColor(...COLOR_TEXTO);
                docPdf.text(lineasCarta, margin + 24, y + 38);

                y += altoCaja + 28;
            }

            // --- RECUERDOS ---
            if (album.fotos?.length > 0) {
                nuevaPaginaSiNoCabe(40);
                docPdf.setFont("helvetica", "bold");
                docPdf.setFontSize(10);
                docPdf.setTextColor(...COLOR_SUAVE);
                docPdf.text(`NUESTROS MOMENTOS (${album.fotos.length})`, pageWidth / 2, y, {
                    align: "center",
                });
                y += 20;

                for (let i = 0; i < album.fotos.length; i++) {
                    const foto = album.fotos[i];
                    const imgInfo = await cargarImagenAjustada(foto.url, maxWidth - 48, 240);

                    const tituloFoto = `${String(i + 1).padStart(2, "0")}  •  ${foto.titulo || "Recuerdo"}`;
                    const subLineas = foto.subtitulo?.trim()
                        ? docPdf.splitTextToSize(`“${foto.subtitulo.trim()}”`, maxWidth - 48)
                        : [];

                    const altoImagen = imgInfo ? imgInfo.alto + 14 : 0;
                    const altoTexto = 20 + (subLineas.length > 0 ? subLineas.length * 14 + 6 : 0);
                    const altoTarjeta = altoImagen + altoTexto + 26;

                    nuevaPaginaSiNoCabe(altoTarjeta + 16);

                    docPdf.setFillColor(...COLOR_TARJETA);
                    docPdf.setDrawColor(...COLOR_BORDE);
                    docPdf.setLineWidth(1);
                    docPdf.roundedRect(margin, y, maxWidth, altoTarjeta, 12, 12, "FD");

                    let yInterno = y + 14;

                    if (imgInfo) {
                        const xCentrado = margin + (maxWidth - imgInfo.ancho) / 2;
                        const formato = imgInfo.dataUrl.includes("image/png") ? "PNG" : "JPEG";
                        docPdf.addImage(
                            imgInfo.dataUrl,
                            formato,
                            xCentrado,
                            yInterno,
                            imgInfo.ancho,
                            imgInfo.alto,
                            undefined,
                            "FAST"
                        );
                        yInterno += imgInfo.alto + 16;
                    } else {
                        yInterno += 6;
                    }

                    docPdf.setFont("helvetica", "bold");
                    docPdf.setFontSize(10);
                    docPdf.setTextColor(...COLOR_ACENTO);
                    docPdf.text(tituloFoto, pageWidth / 2, yInterno, { align: "center" });
                    yInterno += 15;

                    if (subLineas.length > 0) {
                        docPdf.setFont("times", "italic");
                        docPdf.setFontSize(11);
                        docPdf.setTextColor(...COLOR_TEXTO);
                        docPdf.text(subLineas, pageWidth / 2, yInterno, { align: "center" });
                    }

                    y += altoTarjeta + 18;
                }
            }

            const nombreLimpio = (album.titulo || "album-privado")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            docPdf.save(`${nombreLimpio || "album-privado"}.pdf`);
        } catch (err) {
            console.error("Error al generar el PDF:", err);
        } finally {
            setDescargandoPdf(false);
        }
    };
    //carga notas del album
    async function cargarNotasAlbum(albumId) {
        if (!albumId || albumId === "demo") return;
        try {
            const notasRef = collection(db, "dedicatorias", albumId, "notas");
            const q = query(notasRef, orderBy("creadoEn", "desc"), limit(20));
            const snap = await getDocs(q);
            const lista = snap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setNotasAlbum(lista);
        } catch (err) {
            console.error("Error cargando notas del álbum:", err);
        }
    }

    async function manejarEnviarNota(e) {
        e.preventDefault();
        const limpia = textoNota.trim();
        if (!limpia || enviandoNota) return;
        if (notasAlbum.length >= MAX_NOTAS_ALBUM) return;

        // Si es el álbum demo, solo lo simulamos en memoria sin tocar Firestore
        if (album.esDemo || !album.id || album.id === "demo") {
            setNotasAlbum((prev) => [
                {
                    id: `local-${Date.now()}`,
                    texto: limpia,
                    autorNombre: user?.displayName || "Tú",
                },
                ...prev,
            ]);
            setTextoNota("");
            setMostrarCajaNota(false);
            setNotaEnviada(true);
            setTimeout(() => setNotaEnviada(false), 2400);
            return;
        }

        setEnviandoNota(true);
        try {
            const notasRef = collection(db, "dedicatorias", album.id, "notas");
            const docRef = await addDoc(notasRef, {
                texto: limpia.slice(0, 240),
                autorNombre:
                    user?.displayName?.trim() ||
                    user?.email?.split("@")[0] ||
                    "Alguien especial",
                autorUid: user?.uid || null,
                creadoEn: serverTimestamp(),
            });

            setNotasAlbum((prev) => [
                {
                    id: docRef.id,
                    texto: limpia.slice(0, 240),
                    autorNombre:
                        user?.displayName?.trim() ||
                        user?.email?.split("@")[0] ||
                        "Alguien especial",
                    autorUid: user?.uid || null,
                },
                ...prev,
            ]);

            setTextoNota("");
            setMostrarCajaNota(false);
            setNotaEnviada(true);
            setTimeout(() => setNotaEnviada(false), 2400);
        } catch (err) {
            console.error("Error guardando nota:", err);
        } finally {
            setEnviandoNota(false);
        }
    }

    // 2. Al cargar el documento en Firestore (dentro de cargarAlbum):
    // fondoUrl: data.albumPrivado?.fondoUrl || "",

    // 3. Handler para cambiar el fondo (solo autor)
    const manejarCambiarFondo = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !user || !album?.esAutor) return;

        setSubiendoFondo(true);
        setErrorAporte("");
        try {
            const publicId = await comprimirYSubirImagen(file);
            const idToken = await user.getIdToken();

            // Guarda el fondo en Firestore mediante una ruta API o updateDoc según tus reglas
            const res = await fetch("/api/album/fondo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ dedicatoriaId: albumId, fondoPublicId: publicId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo guardar el fondo");

            setAlbum((prev) => ({
                ...prev,
                fondoUrl: data.fondoUrl || "",
            }));
        } catch (err) {
            setErrorAporte(err.message);
        } finally {
            setSubiendoFondo(false);
        }
    };

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
                if (snap.exists() && snap.data().albumPrivado?.activo) {
                    const data = snap.data();
                    setAlbum({
                        id: albumId,
                        titulo: `Álbum para ${data.destinatario || "Alguien especial"}`,
                        etiqueta: data.categoria || "Álbum Privado",
                        fecha: "Recuerdo guardado",
                        destinatario: data.destinatario || "Destinatario",
                        autor: data.remitente || "Anónimo",
                        autorId: data.autorId || null,
                        esDemo: false,
                        carta: data.mensaje || "",
                        fraseExtra: null,
                        cancion: null,
                        vistasPrivadas: data.likes || 1,
                        totalFotos: data.albumPrivado.totalFotos || 0,
                        fondoUrl: data.albumPrivado?.fondoUrl || "",
                        fotos: [],
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

    const abrirAlbumEnServidor = async (contrasena) => {
        const headers = { "Content-Type": "application/json" };
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

        const res = await fetch("/api/album/abrir", {
            method: "POST",
            headers,
            body: JSON.stringify({ dedicatoriaId: albumId, contrasena }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo abrir el álbum");

        claveRef.current = contrasena;
        setAlbum((prev) => ({
            ...prev,
            esAutor: data.esAutor,
            permiteAportes: data.permiteAportes,
            limiteFotos: data.limite,
            totalFotos: data.fotos.length,
            fotos: construirFotos(data.fotos, prev.autor),
        }));
        setDesbloqueado(true);
    };

    const agregarFotos = async (e) => {
        const archivos = Array.from(e.target.files || []);
        e.target.value = "";
        if (!archivos.length || !user) return;

        const hueco = (album.limiteFotos || 5) - album.fotos.length;
        if (hueco <= 0) {
            setErrorAporte("El álbum ya está completo.");
            return;
        }
        const aSubir = archivos.slice(0, hueco);

        setSubiendo(true);
        setErrorAporte("");
        try {
            const subidas = [];
            for (const file of aSubir) {
                const publicId = await comprimirYSubirImagen(file);
                subidas.push({ publicId, titulo: "", subtitulo: fraseNuevaFoto.trim(), });
            }

            const idToken = await user.getIdToken();
            const res = await fetch("/api/album/agregar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    dedicatoriaId: albumId,
                    contrasena: claveRef.current,
                    fotos: subidas,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudieron añadir las fotos");

            await abrirAlbumEnServidor(claveRef.current);
            setFraseNuevaFoto("");
        } catch (err) {
            setErrorAporte(err.message);
        } finally {
            setSubiendo(false);
        }
    };
    //permite eliminar una foto del album
    const eliminarFoto = async (foto) => {
        if (!user || !window.confirm("¿Eliminar esta foto del álbum?")) return;
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/album/borrar-foto", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ dedicatoriaId: albumId, fotoId: foto.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo eliminar");

            cerrarLightbox();
            await abrirAlbumEnServidor(claveRef.current);
        } catch (err) {
            setErrorAporte(err.message);
        }
    };

    // se maneja el desbloqueo del album
    const manejarDesbloqueo = async (e) => {
        e.preventDefault();
        if (!album || abriendo) return;

        if (album.esDemo) {
            if (!codigoIngresado.trim()) {
                setErrorCodigo("Escribe cualquier clave de prueba para abrir el álbum demo.");
                return;
            }
            setErrorCodigo("");
            setDesbloqueado(true);
            return;
        }

        if (!codigoIngresado.trim()) {
            setErrorCodigo("Escribe la contraseña del álbum.");
            return;
        }

        setAbriendo(true);
        setErrorCodigo("");
        try {
            await abrirAlbumEnServidor(codigoIngresado);
        } catch (err) {
            setErrorCodigo(err.message);
        } finally {
            setAbriendo(false);
        }
    };

    // El autor entra directamente, sin contraseña (el servidor verifica su sesión)
    useEffect(() => {
        if (!album || album.esDemo || desbloqueado || !user) return;
        if (album.autorId !== user.uid) return;
        abrirAlbumEnServidor("").catch(console.error);
    }, [album?.autorId, user]);

    // Cargar notas cuando el álbum está desbloqueado
    useEffect(() => {
        if (!desbloqueado || !albumId) return;
        if (album?.esDemo || albumId === "elena-vault" || albumId === "demo") {
            return;
        }
        cargarNotasAlbum(albumId);
    }, [desbloqueado, albumId, album?.esDemo]);
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


    const fotoActiva =
        indiceFoto !== null && album?.fotos?.[indiceFoto]
            ? album.fotos[indiceFoto]
            : null;
    const totalLikes = (album?.vistasPrivadas || 0) + (dioLike ? 1 : 0);

    return (
        <div
            className={`min-h-screen flex flex-col transition-colors duration-300 ${modoNoche ? "bg-transparent text-slate-100" : "bg-surface text-on-surface"
                }`}
        >
            <header
                className={`fixed top-0 w-full z-40 pt-safe backdrop-blur-xl transition-colors duration-300 ${modoNoche
                    ? "bg-[#081024]/85 border-b border-indigo-400/15 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                    : "bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                    }`}
            >
                <div className="min-h-[7.25rem] max-w-2xl mx-auto px-2 py-2.5 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                aria-label="Volver"
                                onClick={() => router.back()}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${modoNoche
                                    ? "text-slate-300 hover:text-rose-300 hover:bg-slate-800/80"
                                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                                    }`}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                                <img
                                    src={logo?.src}
                                    alt="DediLove"
                                    className="w-6 h-6 object-contain"
                                />
                            </div>

                            <span className="font-serif text-[22px] leading-[30px] text-primary font-semibold tracking-tight truncate">
                                DediLove
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            <BotonModoNoche className="h-9 px-3" />

                            <Link
                                href="/perfil"
                                aria-label="Mi perfil"
                                className="w-9 h-9 rounded-full bg-primary-fixed text-primary font-serif text-xs font-bold flex items-center justify-center ring-2 ring-primary-fixed/70 shrink-0"
                            >
                                {(user?.displayName || "D").charAt(0).toUpperCase()}
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/15">
                        <Link
                            href="/"
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${modoNoche
                                ? "text-amber-200/90 hover:text-amber-100"
                                : "text-primary hover:text-primary-container"
                                }`}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Volver al muro</span>
                        </Link>

                        <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${modoNoche
                                ? "bg-slate-900/85 text-amber-200 border border-indigo-400/20"
                                : "bg-secondary-fixed text-on-secondary-fixed"
                                }`}
                        >
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
                                {album.totalFotos ?? album.fotos.length} fotos
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
                                disabled={abriendo}
                                className="mt-1 w-full py-3.5 px-5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-bold shadow-[0_6px_18px_rgba(225,29,72,0.25)] transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                <LockOpen className="w-4 h-4" />
                                <span>{abriendo ? "Comprobando…" : "Desbloquear álbum"}</span>
                            </button>
                        </form>
                    </div>
                ) : (
                    <div
                        className="relative isolate flex flex-col w-full rounded-[2rem]
    overflow-hidden shadow-[0_15px_50px_rgba(80,35,45,0.10)]
    border border-white/40"
                        style={
                            album.fondoUrl
                                ? {
                                    backgroundImage: `url(${album.fondoUrl})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundAttachment: "fixed",
                                }
                                : {
                                    background: modoNoche
                                        ? "linear-gradient(145deg, #111827, #1e1b2e)"
                                        : "linear-gradient(145deg, #fff8f5, #fff0f3, #fffaf5)",
                                }
                        }
                    >
                        {album.fondoUrl && (
                            <div
                                aria-hidden="true"
                                className="absolute inset-0 z-0 pointer-events-none"
                                style={{
                                    background: modoNoche
                                        ? "rgba(10, 12, 25, 0.78)"
                                        : "rgba(255, 250, 249, 0.76)",
                                    backdropFilter: "blur(2px)",
                                }}
                            />
                        )}

                        <div className="relative z-10 flex flex-col w-full gap-7 p-3 sm:p-6">

                            {/* PERSONALIZAR FONDO: solo para el autor */}
                            {album.esAutor && !album.esDemo && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => inputFondoRef.current?.click()}
                                        disabled={subiendoFondo}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                bg-white/90 text-slate-700 text-xs font-semibold
                shadow-lg backdrop-blur-md border border-white/60
                hover:bg-white hover:-translate-y-0.5 transition-all
                disabled:opacity-60"
                                    >
                                        <ImagePlus className="w-4 h-4 text-rose-500" />
                                        {subiendoFondo
                                            ? "Guardando fondo..."
                                            : album.fondoUrl
                                                ? "Cambiar fondo"
                                                : "Personalizar fondo"}
                                    </button>

                                    <input
                                        ref={inputFondoRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={manejarCambiarFondo}
                                        className="hidden"
                                    />
                                </div>
                            )}

                            {/* TODO EL CONTENIDO DEL ÁLBUM VA AQUÍ */}


                           

                            <article className="relative overflow-hidden rounded-[1.8rem]
    bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl
    border border-white/70 dark:border-white/10
    shadow-[0_12px_35px_rgba(100,40,50,0.07)]">

                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r
        from-rose-200 via-rose-400 to-orange-200" />

                                <div className="p-6 sm:p-9 flex flex-col gap-5">

                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5
                rounded-full bg-rose-50 dark:bg-rose-950/50
                text-rose-600 dark:text-rose-300
                text-[10px] font-bold uppercase tracking-[0.15em]">
                                            <Heart className="w-3 h-3 fill-current" />
                                            {album.etiqueta}
                                        </span>

                                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {album.fecha}
                                        </span>
                                    </div>

                                    <div className="text-center py-3">
                                        <p className="text-[10px] uppercase tracking-[0.3em]
                text-rose-400 font-bold mb-3">
                                            Una historia para recordar
                                        </p>

                                        <h1 className="font-serif text-3xl sm:text-4xl
                leading-tight text-slate-800 dark:text-slate-100">
                                            {album.titulo}
                                        </h1>

                                        <div className="flex items-center justify-center gap-3 mt-5">
                                            <span className="w-10 h-px bg-rose-200 dark:bg-rose-900" />
                                            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                                            <span className="w-10 h-px bg-rose-200 dark:bg-rose-900" />
                                        </div>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                                            Dedicado con cariño para{" "}
                                            <span className="font-semibold text-rose-500">
                                                {album.destinatario}
                                            </span>
                                        </p>
                                    </div>

                                    {album.carta?.trim() && (
                                        <div className="relative rounded-2xl bg-[#fffaf6]
                dark:bg-slate-800/80 p-5 sm:p-7
                border border-rose-100 dark:border-white/5">

                                            <span className="absolute -top-3 left-5 text-4xl
                    font-serif text-rose-300 leading-none">
                                                “
                                            </span>

                                            <p className="font-serif text-lg sm:text-xl
                    leading-[1.9] text-slate-700 dark:text-slate-200
                    italic text-center">
                                                {album.carta}
                                            </p>

                                            {album.fraseExtra && (
                                                <p className="mt-5 text-center text-[11px]
                        text-slate-400 tracking-wide">
                                                    {album.fraseExtra.original}
                                                    <span className="mx-1.5">·</span>
                                                    {album.fraseExtra.traduccion}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {album.cancion && (
                                        <div className="flex items-center gap-3 p-3.5 rounded-2xl
                bg-rose-50/80 dark:bg-rose-950/30
                border border-rose-100 dark:border-rose-900/40">

                                            <button
                                                type="button"
                                                aria-label={reproduciendo ? "Pausar audio" : "Reproducir audio"}
                                                onClick={() => setReproduciendo((prev) => !prev)}
                                                className="w-11 h-11 rounded-full bg-rose-500
                        text-white flex items-center justify-center
                        shadow-md hover:bg-rose-600 active:scale-95
                        transition-all shrink-0"
                                            >
                                                {reproduciendo
                                                    ? <Pause className="w-4 h-4 fill-current" />
                                                    : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                            </button>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] uppercase tracking-widest
                        text-rose-400 font-bold">
                                                    Nuestra banda sonora
                                                </p>
                                                <p className="text-sm font-semibold text-slate-700
                        dark:text-slate-200 truncate">
                                                    {album.cancion.titulo}
                                                </p>
                                            </div>

                                            <span className="text-xs text-slate-400">
                                                {album.cancion.duracion}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </article>

                            <div className="flex items-end justify-between gap-3 px-1">
                                <div>
                                    <p
                                        className={`text-[10px] uppercase tracking-[0.25em] font-bold mb-1 transition-colors ${modoNoche ? "text-rose-400" : "text-rose-500"
                                            }`}
                                    >
                                        Nuestra colección
                                    </p>
                                    <h2
                                        className={`font-serif text-2xl sm:text-3xl transition-colors ${modoNoche ? "text-slate-100" : "text-slate-800"
                                            }`}
                                    >
                                        Pequeños grandes momentos
                                    </h2>
                                    <p
                                        className={`text-xs mt-1 transition-colors ${modoNoche ? "text-amber-200/85" : "text-slate-500"
                                            }`}
                                    >
                                        {album.fotos.length} recuerdos guardados
                                    </p>
                                </div>

                                <span
                                    className={`text-[10px] rounded-full px-3 py-2 border shrink-0 transition-colors ${modoNoche
                                            ? "text-slate-200 bg-slate-900/85 border-indigo-400/20"
                                            : "text-slate-500 bg-white/80 border-white/60"
                                        }`}
                                >
                                    <ZoomIn className="w-3.5 h-3.5 inline mr-1" />
                                    Explorar
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:gap-5">
                                {album.fotos.map((foto, index) => (
                                    <div
                                        key={foto.id}
                                        onClick={() => abrirLightbox(index)}
                                        className={`group relative rounded-2xl overflow-hidden cursor-pointer
    transition-all duration-300 hover:-translate-y-1
    hover:shadow-xl
    ${foto.polaroid
                                                ? "bg-white dark:bg-slate-100 p-2 pb-3 shadow-[0_5px_18px_rgba(40,20,20,0.12)] rotate-[1deg] hover:rotate-0"
                                                : "bg-white/90 dark:bg-slate-900/90 shadow-[0_5px_18px_rgba(40,20,20,0.10)]"
                                            }`}
                                    >
                                        <div
                                            className={`${foto.alto} w-full overflow-hidden ${foto.polaroid ? "rounded-xl" : ""
                                                } bg-gradient-to-br ${foto.tono} relative flex items-center justify-center`}
                                        >
                                            <div className="absolute top-3 left-3 z-10 px-2 py-1
    rounded-full bg-black/35 backdrop-blur-md
    text-white text-[9px] font-semibold tracking-wider">
                                                {foto.codigo}
                                            </div>
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

                            {(album.permiteAportes || album.esAutor) && !album.esDemo && (
                                <div className="bg-surface-container-lowest z-100 rounded-3xl p-4 shadow-[0_6px_20px_rgba(100,40,50,0.04)] flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-on-surface">
                                                {album.esAutor ? "Añade más fotos" : "Suma tus fotos"}
                                            </p>
                                            <p className="text-xs text-on-surface-variant">
                                                {album.fotos.length} / {album.limiteFotos} fotos en el álbum
                                            </p>
                                        </div>

                                        {!user ? (
                                            <Link
                                                href="/perfil"
                                                className="shrink-0 px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-semibold"
                                            >
                                                Inicia sesión
                                            </Link>
                                        ) : album.fotos.length >= album.limiteFotos ? (
                                            <span className="shrink-0 text-xs font-semibold text-outline">
                                                Álbum completo
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => inputAportesRef.current?.click()}
                                                disabled={subiendo}
                                                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container text-on-primary text-xs font-semibold disabled:opacity-70"
                                            >
                                                <ImagePlus className="w-4 h-4" />
                                                <span>{subiendo ? "Subiendo…" : "Añadir fotos"}</span>
                                            </button>
                                        )}
                                    </div>

                                    {user && album.fotos.length < album.limiteFotos && (
                                        <div className="w-full">
                                            <input
                                                type="text"
                                                maxLength={90}
                                                value={fraseNuevaFoto}
                                                onChange={(e) => setFraseNuevaFoto(e.target.value)}
                                                placeholder="Frase corta para esta foto (opcional)..."
                                                className="w-full rounded-2xl bg-surface-container-low px-3.5 py-2 text-xs text-on-surface placeholder:text-outline/70 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {errorAporte && (
                                <p className="text-xs text-error font-medium px-1">{errorAporte}</p>
                            )}

                            <input
                                ref={inputAportesRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={agregarFotos}
                                className="hidden"
                            />

                            <div className="bg-surface-container-lowest z-100 rounded-3xl p-5 shadow-[0_6px_20px_rgba(100,40,50,0.04)] space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDioLike((prev) => !prev)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all ${dioLike
                                                ? "bg-primary text-on-primary"
                                                : "bg-primary-fixed text-on-primary-fixed"
                                                }`}
                                        >
                                            <Heart
                                                className={`w-4 h-4 ${dioLike ? "fill-current" : "text-primary fill-primary"
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
                                {mostrarCajaNota && (
                                    <form onSubmit={manejarEnviarNota} className="space-y-2.5 pt-1">
                                        <textarea
                                            rows={2}
                                            maxLength={240}
                                            value={textoNota}
                                            onChange={(e) => setTextoNota(e.target.value)}
                                            placeholder={`Déjale una nota de cariño a ${album.autor || "quien creó este álbum"}...`}
                                            className="w-full rounded-2xl bg-surface-container-low p-3 text-xs sm:text-sm text-on-surface placeholder:text-outline/70 focus:outline-none resize-none"
                                        />
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] text-outline">
                                                {textoNota.length}/240
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMostrarCajaNota(false);
                                                        setTextoNota("");
                                                    }}
                                                    className="px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-semibold"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={enviandoNota || !textoNota.trim()}
                                                    className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-semibold disabled:opacity-60"
                                                >
                                                    {enviandoNota ? "Enviando..." : "Guardar nota"}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                {notasAlbum.length > 0 && (
                                    <div className="relative bg-white/90 dark:bg-slate-900/90
    backdrop-blur-xl border border-white/70 dark:border-white/10
    rounded-[1.6rem] p-5 shadow-[0_8px_25px_rgba(100,40,50,0.06)] space-y-2 pt-2 border-t">
                                        <button
                                            type="button"
                                            onClick={() => setNotasDesplegadas((prev) => !prev)}
                                            className="w-full flex items-center justify-between text-left py-1 rounded-xl hover:bg-surface-container-low/50 transition-colors"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                                                Notas en el álbum ({notasAlbum.length})
                                            </span>
                                            <span className="text-[11px] font-medium text-on-surface-variant">
                                                {notasDesplegadas ? "Ocultar ▲" : "Ver ▼"}
                                            </span>
                                        </button>

                                        {notasDesplegadas && (
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                                                {notasAlbum.map((nota) => (
                                                    <div
                                                        key={nota.id}
                                                        className="rounded-2xl bg-surface-container-low/80 px-3.5 py-2.5 space-y-1"
                                                    >
                                                        <p className="font-serif italic text-xs sm:text-sm text-on-surface">
                                                            “{nota.texto}”
                                                        </p>
                                                        <p className="text-[11px] text-on-surface-variant font-medium">
                                                            — {nota.autorNombre || "Alguien especial"}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={descargarAlbumPdf}
                                        disabled={descargandoPdf}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors active:scale-98"
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>{descargandoPdf ? "Generando PDF..." : "Guardar PDF"}</span>
                                    </button>

                                    {notasAlbum.length >= MAX_NOTAS_ALBUM ? (
                                        <div className="w-full flex items-center justify-center text-center px-3 py-2 rounded-full bg-surface-container-low text-xs font-medium text-outline">
                                            Máximo de {MAX_NOTAS_ALBUM} notas alcanzado
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setMostrarCajaNota((prev) => !prev)}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-[0_4px_14px_rgba(225,29,72,0.25)] hover:opacity-95 transition-opacity active:scale-98"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>Enviar nota</span>
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {fotoActiva && (
                    <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4">
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

                            {/* ⬇️ AQUÍ, entre las dos flechas */}
                            {fotoActiva.puedeBorrar && (
                                <button
                                    type="button"
                                    aria-label="Eliminar foto"
                                    onClick={() => eliminarFoto(fotoActiva)}
                                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-error/70 transition-all active:scale-90"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
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


        </div>
    );
}

export default function AlbumPrivadoPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface-variant text-sm">
                    Cargando álbum privado...
                </div>
            }
        >
            <AlbumPrivadoContent />
        </Suspense>
    );
}
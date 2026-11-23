import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";
import { comprobarContrasena, limiteFotos } from "../../../../lib/albumServidor";

export async function POST(request) {
  const user = await usuarioDesdeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para añadir fotos" }, { status: 401 });
  }

  const { dedicatoriaId, contrasena, fotos } = await request
    .json()
    .catch(() => ({}));

  if (
    !dedicatoriaId ||
    !Array.isArray(fotos) ||
    fotos.length === 0 ||
    fotos.length > 5
  ) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const prefijo = `dedilove/${user.uid}/`;
  const todasSuyas = fotos.every(
    (f) => typeof f.publicId === "string" && f.publicId.startsWith(prefijo)
  );
  if (!todasSuyas) {
    return NextResponse.json({ error: "Fotos no válidas" }, { status: 400 });
  }

  const dedRef = adminDb.collection("dedicatorias").doc(dedicatoriaId);
  const dedSnap = await dedRef.get();
  if (!dedSnap.exists || !dedSnap.data().albumPrivado?.activo) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  const ded = dedSnap.data();
  const esAutor = ded.autorId === user.uid;
  if (!ded.publica && !esAutor) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }
  if (!esAutor && !ded.albumPrivado.permiteAportes) {
    return NextResponse.json(
      { error: "El autor no permite añadir fotos" },
      { status: 403 }
    );
  }

  const albumRef = dedRef.collection("privado").doc("album");
  const albumSnap = await albumRef.get();
  if (!albumSnap.exists) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  if (!esAutor) {
    const r = await comprobarContrasena(albumRef, albumSnap.data(), contrasena);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
  }

  const limite = limiteFotos(ded);

  try {
    const total = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(albumRef);
      const actuales = snap.data().fotos || [];

      if (actuales.length + fotos.length > limite) {
        throw new Error("LIMITE");
      }

      const ultimo = actuales.reduce((m, f) => Math.max(m, f.orden || 0), 0);
      const nuevas = fotos.map((f, i) => ({
        id: randomUUID(),
        publicId: f.publicId,
        titulo: String(f.titulo || "").slice(0, 60),
        orden: ultimo + i + 1,
        subidaPor: user.uid,
      }));
      const todas = [...actuales, ...nuevas];

      tx.update(albumRef, { fotos: todas });
      tx.update(dedRef, { "albumPrivado.totalFotos": todas.length });
      return todas.length;
    });

    return NextResponse.json({ ok: true, total });
  } catch (err) {
    if (err.message === "LIMITE") {
      return NextResponse.json(
        { error: `El álbum está completo (máximo ${limite} fotos)` },
        { status: 400 }
      );
    }
    console.error("Error al añadir fotos:", err);
    return NextResponse.json({ error: "No se pudo añadir las fotos" }, { status: 500 });
  }
}
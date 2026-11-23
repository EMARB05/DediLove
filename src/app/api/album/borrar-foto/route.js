import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";
import { idFoto, autorDeFoto } from "../../../../lib/albumServidor";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  const user = await usuarioDesdeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { dedicatoriaId, fotoId } = await request.json().catch(() => ({}));
  if (!dedicatoriaId || !fotoId) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const dedRef = adminDb.collection("dedicatorias").doc(dedicatoriaId);
  const dedSnap = await dedRef.get();
  if (!dedSnap.exists) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const ded = dedSnap.data();
  const esAutor = ded.autorId === user.uid;
  const albumRef = dedRef.collection("privado").doc("album");

  let publicIdBorrado = null;
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(albumRef);
      if (!snap.exists) throw new Error("NO_ENCONTRADO");

      const fotos = snap.data().fotos || [];
      const foto = fotos.find((f) => idFoto(f) === fotoId);
      if (!foto) throw new Error("NO_ENCONTRADO");
      if (!esAutor && autorDeFoto(foto, ded) !== user.uid) {
        throw new Error("PROHIBIDO");
      }

      publicIdBorrado = foto.publicId;
      const restantes = fotos.filter((f) => idFoto(f) !== fotoId);
      tx.update(albumRef, { fotos: restantes });
      tx.update(dedRef, { "albumPrivado.totalFotos": restantes.length });
    });
  } catch (err) {
    if (err.message === "PROHIBIDO") {
      return NextResponse.json({ error: "No puedes borrar esta foto" }, { status: 403 });
    }
    if (err.message === "NO_ENCONTRADO") {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }
    console.error("Error al borrar foto:", err);
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }

  try {
    await cloudinary.uploader.destroy(publicIdBorrado, {
      type: "authenticated",
      resource_type: "image",
      invalidate: true,
    });
  } catch (err) {
    console.error("No se pudo borrar de Cloudinary:", err);
  }

  return NextResponse.json({ ok: true });
}
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";
import {
  comprobarContrasena,
  limiteFotos,
  idFoto,
  autorDeFoto,
} from "../../../../lib/albumServidor";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try{
  const { dedicatoriaId, contrasena } = await request.json().catch(() => ({}));
  if (!dedicatoriaId) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const user = await usuarioDesdeRequest(request); // opcional

  const dedRef = adminDb.collection("dedicatorias").doc(dedicatoriaId);
  const dedSnap = await dedRef.get();
  if (!dedSnap.exists) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const ded = dedSnap.data();
  const esAutor = Boolean(user && ded.autorId === user.uid);
  if (!ded.publica && !esAutor) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const albumRef = dedRef.collection("privado").doc("album");
  const albumSnap = await albumRef.get();
  if (!albumSnap.exists) {
    return NextResponse.json({ error: "Sin álbum" }, { status: 404 });
  }
  const album = albumSnap.data();

  if (!esAutor) {
    const r = await comprobarContrasena(albumRef, album, contrasena);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
  }

  const fotos = (album.fotos || []).map((f) => ({
    id: idFoto(f),
    titulo: f.titulo,
    subtitulo: f.subtitulo || "",
    orden: f.orden,
    url: cloudinary.url(f.publicId, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      resource_type: "image",
    }),
    puedeBorrar:
      esAutor || Boolean(user && autorDeFoto(f, ded) === user.uid),
  }));

  return NextResponse.json({
    fotos,
    esAutor,
    permiteAportes: Boolean(ded.albumPrivado?.permiteAportes),
    limite: limiteFotos(ded),
  });
}
  catch(err){
    console.error("Error en POST /api/album/abrir:", err);
    return NextResponse.json(
      { error: "Error interno del servidor al abrir el álbum" },
      { status: 500 }
    );
  }
}
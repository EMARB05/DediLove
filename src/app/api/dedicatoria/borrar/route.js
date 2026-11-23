import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "@/lib/firebaseAdmin";

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

  const { dedicatoriaId } = await request.json().catch(() => ({}));
  if (!dedicatoriaId) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const dedRef = adminDb.collection("dedicatorias").doc(dedicatoriaId);
  const snap = await dedRef.get();
  if (!snap.exists) {
    return NextResponse.json({ ok: true }); // ya no existe
  }
  if (snap.data().autorId !== user.uid) {
    return NextResponse.json({ error: "No permitido" }, { status: 403 });
  }

  // 1. Fotos del álbum en Cloudinary (incluidas las de otros usuarios)
  try {
    const albumSnap = await dedRef.collection("privado").doc("album").get();
    const ids = albumSnap.exists
      ? (albumSnap.data().fotos || []).map((f) => f.publicId).filter(Boolean)
      : [];

    for (let i = 0; i < ids.length; i += 100) {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), {
        type: "authenticated",
        resource_type: "image",
        invalidate: true,
      });
    }
  } catch (err) {
    console.error("Error borrando fotos de Cloudinary:", err);
    return NextResponse.json(
      { error: "No se pudieron borrar las fotos. Inténtalo de nuevo." },
      { status: 502 }
    );
  }

  // 2. La dedicatoria y todas sus subcolecciones (privado, likes)
  try {
    await adminDb.recursiveDelete(dedRef);
  } catch (err) {
    console.error("Error borrando la dedicatoria:", err);
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
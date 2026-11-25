import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const user = await usuarioDesdeRequest(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { dedicatoriaId, fondoPublicId } = await request.json();
    if (!dedicatoriaId) {
      return NextResponse.json({ error: "Falta dedicatoriaId" }, { status: 400 });
    }

    const docRef = adminDb.collection("dedicatorias").doc(dedicatoriaId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
    }

    const data = snap.data();
    if (data.autorId !== user.uid) {
      return NextResponse.json(
        { error: "Solo el autor puede cambiar el fondo" },
        { status: 403 }
      );
    }

    // Si fondoPublicId viene vacío, se quita el fondo
    if (!fondoPublicId) {
      await docRef.update({
        "albumPrivado.fondoPublicId": "",
        "albumPrivado.fondoUrl": "",
      });
      return NextResponse.json({ fondoUrl: "" });
    }

    // Genera la URL segura desde Cloudinary
    const fondoUrl = cloudinary.url(fondoPublicId, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
    });

    await docRef.update({
      "albumPrivado.fondoPublicId": fondoPublicId,
      "albumPrivado.fondoUrl": fondoUrl,
    });

    return NextResponse.json({ fondoUrl });
  } catch (err) {
    console.error("Error en POST /api/album/fondo:", err);
    return NextResponse.json(
      { error: "Error interno al guardar el fondo" },
      { status: 500 }
    );
  }
}
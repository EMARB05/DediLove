import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";
import { MAX_ALBUMES_GRATIS, MAX_ALBUMES_PREMIUM  } from "../../../../lib/albumServidor";

export async function POST(request) {
  const user = await usuarioDesdeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [userSnap, snap] = await Promise.all([
    adminDb.collection("usuarios").doc(user.uid).get(),
    adminDb
      .collection("dedicatorias")
      .where("autorId", "==", user.uid)
      .where("albumPrivado.activo", "==", true)
      .get(),
  ]);

  const esUsuarioPremium = Boolean(userSnap.data()?.esPremium);

  if (esUsuarioPremium) {
    const usados = snap.size;
    return NextResponse.json({
      usados,
      maximo: MAX_ALBUMES_PREMIUM,
      disponible: usados < MAX_ALBUMES_PREMIUM,
    });
  }
  const usados = snap.docs.filter((d) => !d.data().premium).length;

  return NextResponse.json({
    usados,
    maximo: MAX_ALBUMES_GRATIS,
    disponible: usados < MAX_ALBUMES_GRATIS,
  });
}
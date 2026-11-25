import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { adminDb, usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";
import { limiteFotos, MAX_ALBUMES_GRATIS } from "../../../../lib/albumServidor";

export async function POST(request) {
  const user = await usuarioDesdeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { dedicatoriaId, contrasena, fotos, permiteAportes } = await request
    .json()
    .catch(() => ({}));

  if (
    !dedicatoriaId ||
    typeof contrasena !== "string" ||
    contrasena.trim().length < 4 ||
    !Array.isArray(fotos) ||
    fotos.length === 0
  ) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const ref = adminDb.collection("dedicatorias").doc(dedicatoriaId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().autorId !== user.uid) {
    return NextResponse.json({ error: "No permitido" }, { status: 403 });
  }

  const ded = snap.data();
  const userSnap = await adminDb.collection("usuarios").doc(user.uid).get();
  const esUsuarioPremium =
    Boolean(userSnap.data()?.esPremium) || Boolean(ded.premium);

  const limite = limiteFotos({ ...ded, premium: esUsuarioPremium });
  if (fotos.length > limite) {
    return NextResponse.json(
      { error: `El álbum admite como máximo ${limite} fotos` },
      { status: 400 }
    );
  }

  // Cupo de álbumes gratuitos por usuario
  if (!esUsuarioPremium) {
    const otros = await adminDb
      .collection("dedicatorias")
      .where("autorId", "==", user.uid)
      .where("albumPrivado.activo", "==", true)
      .get();
    const gratisUsados = otros.docs.filter(
      (d) => d.id !== dedicatoriaId && !d.data().premium
    ).length;
    if (gratisUsados >= MAX_ALBUMES_GRATIS) {
      return NextResponse.json(
        {
          error: `Ya tienes ${MAX_ALBUMES_GRATIS} álbumes gratuitos. Elimina uno o pasa a premium para crear más.`,
        },
        { status: 403 }
      );
    }
  }
  

  // Cupo de álbumes gratuitos por usuario
  if (!ded.premium) {
    const otros = await adminDb
      .collection("dedicatorias")
      .where("autorId", "==", user.uid)
      .where("albumPrivado.activo", "==", true)
      .get();
    const gratisUsados = otros.docs.filter(
      (d) => d.id !== dedicatoriaId && !d.data().premium
    ).length;
    if (gratisUsados >= MAX_ALBUMES_GRATIS) {
      return NextResponse.json(
        {
          error: `Ya tienes ${MAX_ALBUMES_GRATIS} álbumes gratuitos. Elimina uno o pasa a premium para crear más.`,
        },
        { status: 403 }
      );
    }
  }

  const prefijo = `dedilove/${user.uid}/`;
  const todasSuyas = fotos.every(
    (f) => typeof f.publicId === "string" && f.publicId.startsWith(prefijo)
  );
  if (!todasSuyas) {
    return NextResponse.json({ error: "Fotos no válidas" }, { status: 400 });
  }

  const contrasenaHash = await bcrypt.hash(contrasena.trim(), 10);

  await ref.collection("privado").doc("album").set({
    contrasenaHash,
    fotos: fotos.map((f, i) => ({
      id: randomUUID(),
      publicId: f.publicId,
      titulo: String(f.titulo || "").slice(0, 60),
      orden: i + 1,
      subidaPor: user.uid,
    })),
    fallos: 0,
    bloqueadoHasta: 0,
  });

  await ref.update({
    premium: esUsuarioPremium,
    albumPrivado: {
      activo: true,
      totalFotos: fotos.length,
      limiteMaximo: limite,
      permiteAportes: Boolean(permiteAportes),
    },
  });

  return NextResponse.json({ ok: true });
}
import bcrypt from "bcryptjs";

export const LIMITE_FOTOS_GRATIS = 5;
export const LIMITE_FOTOS_PREMIUM = 20;
export const MAX_ALBUMES_GRATIS = 2;

const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

export const limiteFotos = (ded) =>
  ded.premium ? LIMITE_FOTOS_PREMIUM : LIMITE_FOTOS_GRATIS;

// Las fotos antiguas no tienen id ni subidaPor: se usan valores de respaldo
export const idFoto = (f) => f.id || `o${f.orden}`;
export const autorDeFoto = (f, ded) => f.subidaPor || ded.autorId;

// Comprueba la contraseña con límite de intentos.
// Devuelve { ok: true } o { ok: false, status, error }
export async function comprobarContrasena(albumRef, album, contrasena) {
  const ahora = Date.now();

  if ((album.bloqueadoHasta || 0) > ahora) {
    const min = Math.ceil((album.bloqueadoHasta - ahora) / 60000);
    return { ok: false, status: 429, error: `Demasiados intentos. Prueba en ${min} min.` };
  }

  const correcta =
    typeof contrasena === "string" &&
    contrasena.trim().length > 0 &&
    (await bcrypt.compare(contrasena.trim(), album.contrasenaHash));

  if (!correcta) {
    const fallos = (album.fallos || 0) + 1;
    await albumRef.update(
      fallos >= MAX_FALLOS
        ? { fallos: 0, bloqueadoHasta: ahora + BLOQUEO_MS }
        : { fallos }
    );
    return { ok: false, status: 401, error: "Contraseña incorrecta" };
  }

  if (album.fallos) await albumRef.update({ fallos: 0 });
  return { ok: true };
}
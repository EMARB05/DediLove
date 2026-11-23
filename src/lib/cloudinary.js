import { auth } from "../lib/firebase";
export async function comprimirYSubirImagen(file) {
  
  // 1. Comprimir en el navegador con canvas antes de enviar
  const blobComprimido = await new Promise((resolve, reject) => {
    const img = new Image();
    const urlTemporal = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(urlTemporal);
      const maxAncho = 1280;
      let ancho = img.width;
      let alto = img.height;

      if (ancho > maxAncho) {
        alto = Math.round((alto * maxAncho) / ancho);
        ancho = maxAncho;
      }

      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, ancho, alto);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No se pudo comprimir la imagen"));
        },
        "image/webp",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(urlTemporal);
      reject(new Error("Error al leer la imagen"));
    };

    img.src = urlTemporal;
  });

  // 2. Subir a Cloudinary
   // 2. Pedir firma al servidor
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sesión para subir fotos");
  const idToken = await user.getIdToken();

  const resFirma = await fetch("/api/cloudinary/firma", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!resFirma.ok) throw new Error("No se pudo autorizar la subida");
  const { signature, timestamp, folder, apiKey, cloudName } =
    await resFirma.json();

  // 3. Subir a Cloudinary como imagen privada
  const formData = new FormData();
  formData.append("file", blobComprimido, "recuerdo.webp");
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("type", "authenticated");

  const respuesta = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!respuesta.ok) {
    throw new Error("Error al subir la foto a Cloudinary");
  }

  const datos = await respuesta.json();
  return datos.public_id; // ya no devolvemos una URL pública

}
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { usuarioDesdeRequest } from "../../../../lib/firebaseAdmin";



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

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `dedilove/${user.uid}`;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, type: "authenticated" },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
}
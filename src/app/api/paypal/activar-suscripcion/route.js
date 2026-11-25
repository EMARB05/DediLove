import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function getPayPalBaseUrl() {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(baseUrl) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en el servidor.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error obteniendo token de PayPal: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(req) {
  try {
    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { ok: false, error: "Faltan subscriptionId o userId." },
        { status: 400 }
      );
    }

    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getAccessToken(baseUrl);

    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!subRes.ok) {
      const text = await subRes.text();
      return NextResponse.json(
        { ok: false, error: `No se pudo verificar la suscripción en PayPal: ${text}` },
        { status: 400 }
      );
    }

    const subData = await subRes.json();
    const estadoValido = subData.status === "ACTIVE" || subData.status === "APPROVED";

    if (!estadoValido) {
      return NextResponse.json(
        { ok: false, error: `La suscripción no está activa (estado: ${subData.status}).` },
        { status: 400 }
      );
    }

    await adminDb
      .collection("usuarios")
      .doc(userId)
      .set(
        {
          esPremium: true,
          paypalSubscriptionId: subscriptionId,
          paypalPlanId: subData.plan_id || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || null,
          premiumActualizadoEn: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      subscriptionId,
      status: subData.status,
    });
  } catch (error) {
    console.error("Error en /api/paypal/activar-suscripcion:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error interno del servidor." },
      { status: 500 }
    );
  }
}
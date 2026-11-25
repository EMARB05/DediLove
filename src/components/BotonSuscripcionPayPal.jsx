"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function BotonSuscripcionPayPal({ userId, onSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [procesando, setProcesando] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;

  if (!clientId || !planId) {
    return (
      <p className="text-sm text-red-600">
        Falta configurar NEXT_PUBLIC_PAYPAL_CLIENT_ID o NEXT_PUBLIC_PAYPAL_PLAN_ID en .env.local.
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      <PayPalScriptProvider
        options={{
          clientId,
          vault: true,
          intent: "subscription",
        }}
      >
        <PayPalButtons
          disabled={procesando}
          style={{
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          }}
          createSubscription={(data, actions) => {
            setErrorMsg("");
            return actions.subscription.create({
              plan_id: planId,
            });
          }}
          onApprove={async (data) => {
            setProcesando(true);
            setErrorMsg("");
            try {
              const res = await fetch("/api/paypal/activar-suscripcion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionId: data.subscriptionID,
                  userId,
                }),
              });

              const result = await res.json();
              if (!res.ok || !result.ok) {
                throw new Error(result.error || "No se pudo activar la suscripción.");
              }

              if (onSuccess) {
                onSuccess(data.subscriptionID);
              }
            } catch (err) {
              setErrorMsg(err.message || "Error al verificar el pago con el servidor.");
            } finally {
              setProcesando(false);
            }
          }}
          onError={(err) => {
            console.error("Error de PayPal:", err);
            setErrorMsg("Hubo un problema al abrir o procesar PayPal.");
          }}
          onCancel={() => {
            setErrorMsg("Cancelaste el proceso de suscripción.");
          }}
        />
      </PayPalScriptProvider>

      {procesando && (
        <p className="text-xs text-center text-gray-600">
          Activando tu acceso Premium en DediLove...
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-center text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
import DocumentoLegal from "@/components/DocumentoLegal";

export const metadata = {
  title: "Términos y Condiciones | DediLove",
};

export default function TerminosPage() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones de Uso"
      actualizado="25 de noviembre de 2026"
    >
      <h2 className="text-lg font-bold">1. Objeto del servicio</h2>
      <p>
        <strong>DediLove</strong> permite crear y compartir dedicatorias
        digitales, configurar álbumes privados protegidos con contraseña y
        activar ventajas adicionales mediante el plan <strong>Premium</strong>.
      </p>

      <h2 className="text-lg font-bold pt-2">2. Cuenta y álbumes privados</h2>
      <p>
        Para publicar o suscribirte debes iniciar sesión con los métodos
        habilitados (como Google). Eres responsable de la confidencialidad de tu
        cuenta y de la contraseña de tus álbumes privados; al almacenarse con
        hash, no puede recuperarse en texto plano.
      </p>

      <h2 className="text-lg font-bold pt-2">
        3. Plan Gratuito y Suscripción Premium (PayPal)
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Plan Gratuito:</strong> sujeto a los límites vigentes (por
          ejemplo, hasta 2 álbumes gratuitos y hasta 5 fotos por álbum
          gratuito).
        </li>
        <li>
          <strong>Plan Premium:</strong> amplía el límite de fotos por álbum
          privado (hasta 20 fotos), desbloquea estilos visuales adicionales y
          amplía el cupo según las condiciones mostradas al contratar.
        </li>
        <li>
          <strong>Renovación:</strong> la suscripción gestionada mediante{" "}
          <strong>PayPal</strong> se renueva de forma recurrente según la
          periodicidad y el importe indicados antes de confirmar.
        </li>
        <li>
          <strong>Cancelación:</strong> puedes cancelar la renovación automática
          en cualquier momento desde tu cuenta de <strong>PayPal</strong>. La
          baja detiene futuros cobros y el acceso activo se mantiene hasta el
          cierre del periodo ya pagado.
        </li>
        <li>
          <strong>Reembolsos:</strong> Al
          tratarse de un servicio digital activado de inmediato, no se realizan
          reembolsos salvo error de cobro imputable a DediLove o supuestos
          exigidos por ley.
        </li>
      </ul>

      <h2 className="text-lg font-bold pt-2">4. Contenido del usuario</h2>
      <p>
        Respondes por los textos, dedicatorias e imágenes que subas. Queda
        prohibido publicar contenido ilícito, difamatorio, no consentido, que
        vulnere derechos de terceros o que intente eludir controles de
        seguridad o límites del sistema. Podemos retirar contenido o suspender
        cuentas ante incumplimientos.
      </p>

      <h2 className="text-lg font-bold pt-2">5. Responsabilidad y ley aplicable</h2>
      <p>
        El servicio se ofrece «según disponibilidad». Se rige por la normativa
        española y europea aplicable, con sumisión a los juzgados y tribunales
        competentes conforme a la ley.
      </p>
    </DocumentoLegal>
  );
}
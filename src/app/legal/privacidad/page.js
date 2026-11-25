import DocumentoLegal from "@/components/DocumentoLegal";

export const metadata = {
  title: "Política de Privacidad | DediLove",
};

export default function PrivacidadPage() {
  return (
    <DocumentoLegal
      titulo="Política de Privacidad"
      actualizado="25 de noviembre de 2026"
    >
      <p>
        En <strong>DediLove</strong> tratamos tus datos personales conforme al
        RGPD (UE) 2016/679 y la LOPDGDD.
      </p>

      <h2 className="text-lg font-bold pt-2">1. Responsable</h2>
      <p>
        <strong>Emanuel Rodriguez Baltazar</strong>, NIF/CIF{" "}
        <strong>Z2051868C</strong>, domicilio en{" "}
        <strong>Rua Recreo 88, 15680, A Coruña, España</strong> y correo de contacto{" "}
        <strong>emanuel.abner.rodriguez@gmail.com</strong>.
      </p>

      <h2 className="text-lg font-bold pt-2">2. Datos tratados y finalidades</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Cuenta y autenticación:</strong> ID de usuario, nombre,
          correo y foto de perfil para gestionar tu sesión y permisos.
        </li>
        <li>
          <strong>Dedicatorias y álbumes privados:</strong> textos, ajustes
          visuales, fotografías subidas, hash de contraseña del álbum y
          configuración de aportes para prestar el servicio.
        </li>
        <li>
          <strong>Suscripción Premium:</strong> estado <code>esPremium</code> e
          identificadores de suscripción/pago de <strong>PayPal</strong> para
          activar y gestionar el plan y cumplir obligaciones legales.
        </li>
        <li>
          <strong>Seguridad:</strong> registros técnicos e intentos fallidos de
          acceso para prevenir abusos.
        </li>
      </ul>

      <h2 className="text-lg font-bold pt-2">3. Base legal y encargados</h2>
      <p>
        Tratamos los datos por ejecución del servicio solicitado, cumplimiento
        legal, interés legítimo en seguridad y, cuando aplique, consentimiento.
        Utilizamos proveedores tecnológicos como{" "}
        <strong>Google (Firebase / Firestore / Auth)</strong>,{" "}
        <strong>[Cloudinary / proveedor de imágenes]</strong> y{" "}
        <strong>PayPal</strong>, pudiendo implicar transferencias
        internacionales amparadas en garantías del RGPD.
      </p>

      <h2 className="text-lg font-bold pt-2">4. Conservación y derechos</h2>
      <p>
        Conservamos los datos mientras exista relación activa o durante los
        plazos legales exigidos. Puedes solicitar acceso, rectificación,
        supresión, oposición, limitación o portabilidad escribiendo a{" "}
        <strong>emanuel.abner.rodriguez@gmail.com</strong>, y reclamar ante la AEPD (
        <code>www.aepd.es</code>).
      </p>
    </DocumentoLegal>
  );
}
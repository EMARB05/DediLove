import DocumentoLegal from "@/components/DocumentoLegal";

export const metadata = {
  title: "Política de Cookies | DediLove",
};

export default function CookiesPage() {
  return (
    <DocumentoLegal
      titulo="Política de Cookies y Almacenamiento Local"
      actualizado="25 de noviembre de 2026"
    >
      <p>
        <strong>DediLove</strong> utiliza cookies y almacenamiento local en el
        navegador (<code>localStorage</code> / <code>sessionStorage</code>).
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Técnicas o necesarias:</strong> mantienen la sesión, el estado
          de navegación y preferencias básicas de interfaz.
        </li>
        <li>
          <strong>Analíticas o de terceros (si las activas):</strong> solo
          deben cargarse con consentimiento previo del usuario si no son
          estrictamente necesarias.
        </li>
      </ul>
      <p>
        Puedes borrar o bloquear cookies y almacenamiento local desde la
        configuración de tu navegador; ten en cuenta que algunas funciones
        pueden dejar de funcionar correctamente.
      </p>
    </DocumentoLegal>
  );
}
import DocumentoLegal from "@/components/DocumentoLegal";

export const metadata = {
  title: "Aviso Legal | DediLove",
};

export default function AvisoLegalPage() {
  return (
    <DocumentoLegal titulo="Aviso Legal" actualizado="25 de noviembre de 2026">
      <p>
        En cumplimiento del deber de información de la normativa aplicable de
        servicios de la sociedad de la información y comercio electrónico
        (LSSI-CE), se informan los datos identificativos del responsable de{" "}
        <strong>DediLove</strong>:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Titular / Responsable:</strong>Emanuel Rodriguez Baltazar</li>
        <li><strong>NIF / CIF:</strong> Z2051868C</li>
        <li><strong>Domicilio:</strong> Rua Recreo 88, A Coruña, 15680,España</li>
        <li><strong>Correo electrónico:</strong> emanuel.abner.rodriguez@gmail.com</li>
        <li><strong>Sitio web:</strong> https://dedilovee.netlify.app</li>
      </ul>
      <h2 className="text-lg font-bold pt-2">Condiciones de uso</h2>
      <p>
        El acceso y uso de <strong>DediLove</strong> atribuye la condición de
        usuario e implica la aceptación de este Aviso Legal, los Términos y
        Condiciones, la Política de Privacidad y la Política de Cookies. El
        titular podrá modificar funcionalidades, límites técnicos o condiciones
        para mantener o mejorar el servicio.
      </p>
      <h2 className="text-lg font-bold pt-2">Propiedad intelectual</h2>
      <p>
        El código, diseño, marcas, logotipos y estructura de{" "}
        <strong>DediLove</strong> pertenecen a Emanuel Rodriguez Baltazar
        o cuentan con licencia de uso. Queda prohibida su reproducción o
        explotación no autorizada.
      </p>
    </DocumentoLegal>
  );
}
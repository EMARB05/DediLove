import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata = {
  title: "DediLove — Dedicatorias y Álbumes Privados",
  description:
    "Comparte dedicatorias románticas, de amistad y familia, y guarda recuerdos en álbumes privados.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="es"
      className={`${playfairDisplay.variable} ${plusJakartaSans.variable}`}
    >
      <body className="bg-[#fcf9f7] font-sans text-[#1b1c1b] antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
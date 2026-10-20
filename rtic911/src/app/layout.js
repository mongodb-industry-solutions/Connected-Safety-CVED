import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "RTIC 911 Simulator",
  description: "Simulated RTIC 911 center receiving COVESA CVED crash alerts from VISSR, with context from MongoDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

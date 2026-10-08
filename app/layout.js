import "./globals.css";

export const metadata = {
  title: "Waypath — track your business journey",
  description: "A personal workspace that helps you see where your business is, track what you've accomplished, and know what comes next.",
};

// This was missing before, which is the main reason the app looked "zoomed
// out" on phones: without it, mobile browsers assume a ~980px desktop-width
// page and shrink the whole thing to fit instead of letting it reflow at the
// device's actual width.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" />
      </head>
      <body style={{ margin: 0, background: "#F6F5F1" }}>{children}</body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: 20 }}>{children}</body>
    </html>
  );
}

import "../src/styles.css";

export const metadata = {
  title: "SOFT7 Superadmin Control",
  description: "Platform operations management portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

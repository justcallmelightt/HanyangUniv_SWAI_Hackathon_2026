import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "버림 — 잘 버리는 가장 빠른 방법";
const description =
  "가까운 분리배출 장소를 찾고, 사진 한 장으로 올바른 배출 방법과 행동 요령을 안내받으세요.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    applicationName: "버림",
    keywords: ["분리수거", "분리배출", "재활용", "쓰레기통 위치", "AI 품목 인식"],
    openGraph: {
      title,
      description: "찍으면 알고, 찾으면 바로 버리는 분리배출 Super App",
      type: "website",
      locale: "ko_KR",
      siteName: "버림",
      images: [
        {
          url: socialImage,
          width: 1731,
          height: 909,
          alt: "버림 — 잘 버리는 가장 빠른 방법",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "찍으면 알고, 찾으면 바로 버리는 분리배출 Super App",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#151916",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

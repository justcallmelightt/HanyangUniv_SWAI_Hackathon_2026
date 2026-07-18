import type { Metadata } from "next";
import { WasteApp } from "./WasteApp";

export const metadata: Metadata = {
  title: "버림 — 잘 버리는 가장 빠른 방법",
  description:
    "가까운 분리배출 장소를 찾고, 사진 한 장으로 올바른 배출 방법을 안내받으세요.",
};

export default function Home() {
  return <WasteApp />;
}

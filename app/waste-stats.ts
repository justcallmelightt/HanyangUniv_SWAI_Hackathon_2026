// 사용자의 분리배출 기록과 월별 통계(탄소 절감량 포함)를 계산/저장하는 유틸.
// 로그인 계정: Supabase auth의 user_metadata.wasteRecords 에 저장 (기기가 바뀌어도 유지).
// 게스트(비로그인) 상태: 브라우저 localStorage 에 저장 (같은 기기에서 재방문 시에도 유지).

export type WasteRecord = {
  id: string;
  itemName: string;
  material: string;
  category: string;
  carbonKg: number;
  timestamp: string; // ISO 문자열
};

const MAX_RECORDS = 60;
const GUEST_STORAGE_KEY = "wasteapp:records:guest";

// 품목 재질에 따른 1건당 대략적인 탄소 절감 추정치(kg CO2e). 정밀 계측치가 아니라
// 앱 내 동기부여용 지표로 사용하기 위한 근사값입니다.
function estimateCarbonKg(material: string, category: string): number {
  const text = `${material} ${category}`;
  if (/유리/.test(text)) return 0.25;
  if (/캔|알루미늄|철/.test(text)) return 0.3;
  if (/건전지|배터리|전자|가전/.test(text)) return 0.5;
  if (/종이|골판지|박스|팩/.test(text)) return 0.15;
  if (/비닐|코팅/.test(text)) return 0.1;
  if (/페트|플라스틱/.test(text)) return 0.2;
  return 0.2;
}

export function createRecord(analysis: { itemName: string; material: string; category: string }): WasteRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: analysis.itemName,
    material: analysis.material,
    category: analysis.category,
    carbonKg: estimateCarbonKg(analysis.material, analysis.category),
    timestamp: new Date().toISOString(),
  };
}

export function addRecord(records: WasteRecord[], record: WasteRecord): WasteRecord[] {
  return [record, ...records].slice(0, MAX_RECORDS);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export type MonthlyStats = {
  thisMonthCount: number;
  lastMonthCount: number;
  thisMonthCarbonKg: number;
  diff: number;
};

// 이번 달 · 지난달 기록을 비교해 개수/탄소 절감량을 계산합니다.
export function computeMonthlyStats(records: WasteRecord[], now: Date = new Date()): MonthlyStats {
  const thisKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(lastMonthDate);

  let thisMonthCount = 0;
  let lastMonthCount = 0;
  let thisMonthCarbonKg = 0;

  for (const record of records) {
    const recordDate = new Date(record.timestamp);
    if (Number.isNaN(recordDate.getTime())) continue;
    const key = monthKey(recordDate);
    if (key === thisKey) {
      thisMonthCount += 1;
      thisMonthCarbonKg += record.carbonKg;
    } else if (key === lastKey) {
      lastMonthCount += 1;
    }
  }

  return {
    thisMonthCount,
    lastMonthCount,
    thisMonthCarbonKg: Math.round(thisMonthCarbonKg * 10) / 10,
    diff: thisMonthCount - lastMonthCount,
  };
}

export function formatRecordTime(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const hours = date.getHours();
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeText = `${period} ${displayHour}:${minutes}`;

  if (sameDay) return `오늘, ${timeText}`;
  if (isYesterday) return `어제, ${timeText}`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isWasteRecordArray(value: unknown): value is WasteRecord[] {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "id" in item && "timestamp" in item);
}

// 로그인한 계정(Supabase user_metadata)에 저장된 기록을 읽어옵니다.
export function loadRecordsFromUser(user: { user_metadata?: Record<string, unknown> | null } | null): WasteRecord[] {
  const raw = user?.user_metadata?.wasteRecords;
  return isWasteRecordArray(raw) ? raw : [];
}

// 비로그인(게스트) 상태에서는 이 기기의 localStorage에 저장해 재방문 시에도 유지합니다.
export function loadGuestRecords(): WasteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return isWasteRecordArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestRecords(records: WasteRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 저장 공간이 없거나(용량 초과) 비공개 모드인 경우 조용히 무시합니다.
  }
}

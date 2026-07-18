export type WasteRecord = {
  id: string;
  itemName: string;
  material: string;
  category: string;
  estimatedCarbonKg: number;
  timestamp: string;
};

export type MonthlyStats = {
  thisMonthCount: number;
  lastMonthCount: number;
  estimatedCarbonKg: number;
  diff: number;
};

const MAX_RECORDS = 60;
const GUEST_STORAGE_KEY = "wasteapp:records:guest";

function estimateCarbonKg(material: string, category: string) {
  const text = `${material} ${category}`;
  if (/유리/.test(text)) return 0.25;
  if (/캔|알루미늄|철/.test(text)) return 0.3;
  if (/건전지|배터리|전자|가전/.test(text)) return 0.5;
  if (/종이|골판지|박스|팩/.test(text)) return 0.15;
  if (/비닐|코팅/.test(text)) return 0.1;
  return 0.2;
}

export function createRecord(analysis: { itemName: string; material: string; category: string }): WasteRecord {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: analysis.itemName,
    material: analysis.material,
    category: analysis.category,
    estimatedCarbonKg: estimateCarbonKg(analysis.material, analysis.category),
    timestamp: new Date().toISOString(),
  };
}

export function addRecord(records: WasteRecord[], record: WasteRecord) {
  return [record, ...records].slice(0, MAX_RECORDS);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function computeMonthlyStats(records: WasteRecord[], now = new Date()): MonthlyStats {
  const current = monthKey(now);
  const previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let thisMonthCount = 0;
  let lastMonthCount = 0;
  let estimatedCarbonKg = 0;

  for (const record of records) {
    const date = new Date(record.timestamp);
    if (Number.isNaN(date.getTime())) continue;
    if (monthKey(date) === current) {
      thisMonthCount += 1;
      estimatedCarbonKg += record.estimatedCarbonKg;
    } else if (monthKey(date) === previous) {
      lastMonthCount += 1;
    }
  }

  return {
    thisMonthCount,
    lastMonthCount,
    estimatedCarbonKg: Math.round(estimatedCarbonKg * 10) / 10,
    diff: thisMonthCount - lastMonthCount,
  };
}

export function formatRecordTime(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const hours = date.getHours();
  const time = `${hours < 12 ? "오전" : "오후"} ${hours % 12 || 12}:${date.getMinutes().toString().padStart(2, "0")}`;
  if (date.toDateString() === now.toDateString()) return `오늘, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `어제, ${time}`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isWasteRecordArray(value: unknown): value is WasteRecord[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as Partial<WasteRecord>;
    return typeof record.id === "string" && typeof record.itemName === "string" &&
      typeof record.material === "string" && typeof record.category === "string" &&
      typeof record.timestamp === "string" && Number.isFinite(record.estimatedCarbonKg);
  });
}

export function loadRecordsFromUser(user: { user_metadata?: Record<string, unknown> | null } | null) {
  const raw = user?.user_metadata?.wasteRecords;
  return isWasteRecordArray(raw) ? raw : [];
}

export function loadGuestRecords() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    return raw && isWasteRecordArray(JSON.parse(raw)) ? JSON.parse(raw) as WasteRecord[] : [];
  } catch {
    return [];
  }
}

export function saveGuestRecords(records: WasteRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 비공개 모드나 저장 공간 부족 시 앱 사용은 계속 가능하게 둡니다.
  }
}

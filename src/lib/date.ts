// 날짜 유틸 — 'YYYY-MM-DD' 문자열만 다룬다.
// new Date('YYYY-MM-DD') 문자열 파싱은 쓰지 않는다(UTC/로컬 혼용 방지): 숫자 분해 + Date.UTC만.

export type InvalidDate = { error: 'invalid_date' };

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function parseYMD(s: unknown): { y: number; m: number; d: number } | null {
  if (typeof s !== 'string') return null;
  const match = YMD_RE.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

/** 실제로 존재하는 'YYYY-MM-DD'인지 */
export function isValidYMD(s: unknown): boolean {
  return parseYMD(s) !== null;
}

/** 기기 로컬 기준 오늘 'YYYY-MM-DD' */
export function getToday(): string {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 월 더하기. 도착 달에 같은 일자가 없으면 말일로 맞춘다(01-31 + 1개월 = 02-28). */
export function addMonthsClamped(dateStr: string, months: number): string | InvalidDate {
  const p = parseYMD(dateStr);
  if (!p || !Number.isFinite(months)) return { error: 'invalid_date' };
  const total = p.y * 12 + (p.m - 1) + Math.trunc(months);
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const d = Math.min(p.d, daysInMonth(y, m));
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** dateA − dateB (일). 부호 있음: A가 나중이면 양수. 잘못된 입력이면 NaN. */
export function diffDays(dateA: string, dateB: string): number {
  const a = parseYMD(dateA);
  const b = parseYMD(dateB);
  if (!a || !b) return NaN;
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / MS_PER_DAY);
}

/** 숫자만 뽑아 8자리까지 'YYYY-MM-DD'로 자동 하이픈 */
export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

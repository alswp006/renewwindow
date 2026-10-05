/** 정수 원 → "2억 1,000만원" / "52만 5,000원" / "0원" */
export function formatKRW(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (!Number.isFinite(n) || n === 0) return '0원';
  const eok = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const won = n % 10000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('en-US')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('en-US')}만`);
  if (won > 0) parts.push(won.toLocaleString('en-US'));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${parts.join(' ')}원`;
}

/** 숫자 외 문자 제거 */
export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** 입력 칸용 천 단위 콤마. 빈 값은 빈 문자열 */
export function formatNumberInput(raw: string): string {
  const digits = digitsOnly(raw).replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 금리 표시: 4.5 → "4.5", 9 → "9" */
export function formatRate(rate: number): string {
  return String(Number(rate.toFixed(2)));
}

/** 백분율 소수 둘째 자리 고정: 2.5 → "2.50" */
export function formatPercent2(percent: number): string {
  return percent.toFixed(2);
}

/** D-day 표기. 지난 날은 D+n */
export function formatDday(days: number): string {
  return days < 0 ? `D+${Math.abs(days)}` : `D-${days}`;
}

import type { ChecklistItem } from '@/lib/types';

// 주택임대차보호법 · 시행령 상수
export const RENEWAL_START_MONTHS = 6; // 제6조의3 제1항
export const RENEWAL_END_MONTHS = 2; // 제6조의3 제1항
export const INCREASE_CAP_PERCENT = 5; // 제7조 제2항
export const CONVERSION_CAP_PERCENT = 10; // 제7조의2 제1호
export const CONVERSION_SPREAD_PERCENT = 2; // 시행령 제9조 제2항

export const MAX_CONTRACTS = 20;

// 기준금리 기본값(설정에서 사용자가 바꿀 수 있다).
export const DEFAULT_BASE_RATE = 2.5;
// 위 기본값의 기준일
export const DEFAULT_BASE_RATE_AS_OF = '2026-10-06';

// title의 {마감일}은 화면에서 실제 마감일로 치환한다.
export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'deliver_by_deadline',
    title: '갱신 요구는 {마감일}까지 집주인에게 도달해야 해요',
    source: '민법 제111조 제1항 · 주택임대차보호법 제6조의3 제1항',
  },
  {
    id: 'once_two_years',
    title: '갱신요구권은 1회만 쓸 수 있고, 갱신되면 계약기간은 2년이에요',
    source: '주택임대차보호법 제6조의3 제2항',
  },
  {
    id: 'cap_5_percent',
    title: '갱신 시 보증금·월세 증액은 5% 이내예요',
    source: '주택임대차보호법 제6조의3 제3항 · 제7조 제2항',
  },
  {
    id: 'local_ordinance',
    title: '시·도 조례로 상한이 5%보다 낮을 수 있어요',
    source: '주택임대차보호법 제7조 제2항 단서',
  },
  {
    id: 'one_year_rule',
    title: '증액 후 1년 안에는 다시 올릴 수 없어요',
    source: '주택임대차보호법 제7조 제1항',
  },
  {
    id: 'conversion_cap',
    title: '보증금을 월세로 바꿀 땐 연 10%와 기준금리+2%p 중 낮은 비율이 상한이에요',
    source: '주택임대차보호법 제7조의2 · 시행령 제9조',
  },
  {
    id: 'owner_residence',
    title: '집주인(직계존속·비속 포함)이 실제 거주하려는 경우 갱신을 거절할 수 있어요',
    source: '주택임대차보호법 제6조의3 제1항 제8호',
  },
  {
    id: 'tenant_termination',
    title: '갱신된 계약은 세입자가 언제든 해지를 통지할 수 있고 3개월 뒤 효력이 생겨요',
    source: '주택임대차보호법 제6조의3 제4항 · 제6조의2',
  },
];

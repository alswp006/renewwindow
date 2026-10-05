import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from '@/__tests__/__helpers__/mocks';
import App from '@/App';

// 라우터는 목킹하지 않는다 — App의 실제 라우트로 홈 → 계약 등록 → 결과 → 통보 점검을 걷는다(F4-AC-1).
mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock('@/components/AdSlot', () => ({
  AdSlot: () => <div data-testid="ad-slot" />,
}));

const KEY = 'renewwindow:contracts:v1';

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('전체 흐름 E2E (홈 → 계약 등록 → 결과 → 통보 점검)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T09:00:00+09:00'));
    Element.prototype.scrollIntoView = vi.fn();
    mockOpenToast.mockClear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  async function registerContract() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: '첫 계약 등록하기' }));
    change(/계약 이름/, '망원동 투룸');
    change(/만기일/, '20270331');
    change(/현재 보증금/, '200000000');
    change(/현재 월세/, '500000');
    expect((screen.getByLabelText(/만기일/) as HTMLInputElement).value).toBe('2027-03-31');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    // 결과 화면은 저장소를 다음 마이크로태스크에 읽는다 — 그 갱신이 act 밖에서 돌지 않게 여기서 기다린다.
    await screen.findByText('D-117');
  }

  it('빈 저장소의 홈에서 계약을 등록하면 토스트와 결과 무료 층 값이 보인다', async () => {
    await registerContract();

    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith('계약을 저장했어요'));
    const free = screen.getByTestId('free-tier');
    expect(within(free).getByText('D-117')).toBeInTheDocument();
    expect(within(free).getByText('요구 마감 2027-01-31')).toBeInTheDocument();
    expect(within(free).getByText('2억 1,000만원')).toBeInTheDocument();
    expect(within(free).getByText('52만 5,000원')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      nickname: '망원동 투룸',
      endDate: '2027-03-31',
      deposit: 200_000_000,
      monthlyRent: 500_000,
    });
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });

  it('결과에서 통보 점검으로 넘어가 새 금액을 넣으면 상한 초과가 보이고 console.error는 0회다', async () => {
    await registerContract();

    // 통보일 2026-12-20은 등록일(2026-10-06) 기준 미래라 검증이 거부한다(SPEC 통보 AC-5) —
    // 통보를 받은 뒤의 날로 시계를 옮긴다.
    vi.setSystemTime(new Date('2027-01-10T09:00:00+09:00'));
    fireEvent.click(await screen.findByText('집주인 인상 통보 점검하기'));
    fireEvent.click(await screen.findByRole('tab', { name: '새 금액으로 입력' }));
    change(/통보일/, '20261220');
    change(/새 보증금/, '216000000');
    change(/새 월세/, '550000');
    fireEvent.click(screen.getByRole('button', { name: '점검하기' }));

    const result = await screen.findByTestId('notice-result');
    expect(within(result).getAllByText('상한 초과').length).toBeGreaterThan(0);
    expect(within(result).getByText('보증금 8.00% 인상 · 600만원 초과')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    expect(saved[0].notice).toMatchObject({
      noticeDate: '2026-12-20',
      newDeposit: 216_000_000,
      newMonthlyRent: 550_000,
      inputMode: 'amount',
    });
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });
});

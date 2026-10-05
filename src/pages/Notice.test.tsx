import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import {
  mockAll,
  mockNavigate,
  mockOpenToast,
  mockLogClick,
  mockLogImpression,
  mockRequestReviewOnce,
} from '@/__tests__/__helpers__/mocks';
import Notice from '@/pages/Notice';
import type { Contract } from '@/lib/types';

mockAll();

const quota = vi.hoisted(() => ({ on: false }));
vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...actual,
    saveContract: (...args: Parameters<typeof actual.saveContract>) =>
      quota.on ? ({ ok: false, error: 'quota', quota: true } as const) : actual.saveContract(...args),
  };
});

const KEY = 'renewwindow:contracts:v1';
const CONTRACT: Contract = {
  id: 'c1',
  nickname: '망원동 투룸',
  endDate: '2027-03-31',
  deposit: 200_000_000,
  monthlyRent: 500_000,
  renewalRightUsed: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

function renderNotice(path = '/contracts/c1/notice', contracts: Contract[] = [CONTRACT]) {
  localStorage.setItem(KEY, JSON.stringify(contracts));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contracts/:id/notice" element={<Notice />} />
      </Routes>
    </MemoryRouter>,
  );
}

const change = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function fillAndSubmit() {
  fireEvent.click(await screen.findByRole('tab', { name: '새 금액으로 입력' }));
  change(/통보일/, '20260920');
  change(/새 보증금/, '216000000');
  change(/새 월세/, '550000');
  fireEvent.click(screen.getByRole('button', { name: '점검하기' }));
}

const stored = (): Contract => JSON.parse(localStorage.getItem(KEY) ?? '[]')[0];

beforeEach(() => {
  quota.on = false;
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-06T09:00:00+09:00'));
});

describe('Notice 화면', () => {
  it('점검하면 결과가 보이고 notice가 저장되며 리뷰 요청이 1회 호출된다', async () => {
    renderNotice();
    expect(await screen.findByText('망원동 투룸 인상 통보 점검')).toBeInTheDocument();
    await fillAndSubmit();
    expect(await screen.findByTestId('notice-result')).toBeInTheDocument();
    expect(stored().notice).toMatchObject({
      noticeDate: '2026-09-20',
      newDeposit: 216_000_000,
      newMonthlyRent: 550_000,
      inputMode: 'amount',
    });
    expect(typeof stored().notice?.checkedAt).toBe('string');
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith('notice_check_submit');
  });

  it('저장된 notice가 있으면 탭·입력값·결과가 복원된다', async () => {
    renderNotice('/contracts/c1/notice', [
      {
        ...CONTRACT,
        notice: {
          noticeDate: '2026-09-20',
          newDeposit: 216_000_000,
          newMonthlyRent: 550_000,
          inputMode: 'amount',
          checkedAt: '2026-10-05T00:00:00.000Z',
        },
      },
    ]);
    const tab = await screen.findByRole('tab', { name: '새 금액으로 입력' });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect((screen.getByLabelText(/새 보증금/) as HTMLInputElement).value).toBe('216,000,000');
    expect(screen.getByTestId('notice-result')).toBeInTheDocument();
  });

  it('notice가 없으면 빈 상태 문구만 보인다', async () => {
    renderNotice();
    expect(
      await screen.findByText('통보 받은 내용을 넣으면 5% 상한 초과 여부를 알려드려요'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('notice-result')).not.toBeInTheDocument();
    expect(mockRequestReviewOnce).not.toHaveBeenCalled();
  });

  it('quota 실패여도 결과는 보이고 토스트가 뜬다', async () => {
    quota.on = true;
    renderNotice();
    await fillAndSubmit();
    expect(await screen.findByTestId('notice-result')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockOpenToast).toHaveBeenCalledWith('저장 공간이 부족해 점검 내용을 저장하지 못했어요'),
    );
    expect(stored().notice).toBeUndefined();
  });

  it('없는 계약이면 notice-not-found만 보이고 목록으로는 replace 이동한다', async () => {
    renderNotice('/contracts/zzz/notice');
    expect(await screen.findByTestId('notice-not-found')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '점검하기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    expect(mockLogClick).not.toHaveBeenCalledWith('notice_check_submit');
    expect(mockLogImpression).not.toHaveBeenCalledWith('notice_result');
    expect(mockRequestReviewOnce).not.toHaveBeenCalled();
  });
});

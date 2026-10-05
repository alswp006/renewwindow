import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mockTds, mockAppsInToss, mockAnalytics } from '@/__tests__/__helpers__/mocks';
import Result from '@/pages/Result';
import type { Contract } from '@/lib/types';

mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock('@/components/AdSlot', () => ({
  AdSlot: () => React.createElement('div', { 'data-testid': 'ad-slot' }),
}));

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

function renderResult() {
  localStorage.setItem('renewwindow:contracts:v1', JSON.stringify([CONTRACT]));
  return render(
    <MemoryRouter initialEntries={['/contracts/c1']}>
      <Routes>
        <Route path="/contracts/:id" element={<Result />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_TOSS_AD_SLOT_ID', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Result 레이아웃', () => {
  it('게이트는 잠금 층만 감싼다 — 무료 층·전환 카드는 그 안에 없다', async () => {
    renderResult();
    const free = await screen.findByTestId('free-tier');
    const conversion = screen.getByTestId('conversion-card');
    const locked = await screen.findByTestId('locked-tier');
    expect(locked.contains(free)).toBe(false);
    expect(locked.contains(conversion)).toBe(false);
    expect(free.contains(locked)).toBe(false);
    expect(conversion.contains(locked)).toBe(false);
  });

  it('1차 CTA와 보조 버튼이 있다', async () => {
    renderResult();
    await screen.findByTestId('free-tier');
    expect(screen.getByRole('button', { name: '결과 공유하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '계약 수정' })).toBeInTheDocument();
  });
});

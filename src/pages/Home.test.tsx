import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from '@/__tests__/__helpers__/mocks';
import Home from '@/pages/Home';
import type { Contract } from '@/lib/types';

mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock('@/components/AdSlot', () => ({
  AdSlot: () => React.createElement('div', { 'data-testid': 'ad-slot' }),
}));

function make(id: string, nickname: string, endDate: string): Contract {
  return {
    id,
    nickname,
    endDate,
    deposit: 200000000,
    monthlyRent: 0,
    renewalRightUsed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function renderHome(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
      <Home />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  mockOpenToast.mockClear();
});

describe('Home', () => {
  it('요구 가능한 첫 계약이면 히어로에 마감 D-day와 마감일을 보인다', async () => {
    localStorage.setItem(
      'renewwindow:contracts:v1',
      JSON.stringify([make('a', '망원동 투룸', '2027-03-31'), make('d', '연남동 원룸', '2027-01-15')]),
    );
    renderHome();
    const hero = await screen.findByTestId('home-hero');
    expect(within(hero).getByText('연남동 원룸 갱신 요구 마감까지')).toBeInTheDocument();
    expect(within(hero).getByText('D-40')).toBeInTheDocument();
    expect(within(hero).getByText('2026-11-15까지 집주인에게 도달해야 해요')).toBeInTheDocument();
  });

  it('첫 계약이 기간 지남이면 히어로가 없다', async () => {
    localStorage.setItem(
      'renewwindow:contracts:v1',
      JSON.stringify([make('c', '합정동 투룸', '2026-11-30')]),
    );
    renderHome();
    await screen.findByText('합정동 투룸');
    expect(screen.queryByTestId('home-hero')).toBeNull();
    expect(screen.getByText('기간 지남')).toBeInTheDocument();
  });

  it('계약이 있으면 하단 CTA와 AdSlot 1개, 없으면 둘 다 없다', async () => {
    localStorage.setItem(
      'renewwindow:contracts:v1',
      JSON.stringify([make('a', '망원동 투룸', '2027-03-31')]),
    );
    const { unmount } = renderHome();
    await screen.findByText('망원동 투룸');
    expect(screen.getByRole('button', { name: '계약 추가' })).toBeInTheDocument();
    expect(screen.getAllByTestId('ad-slot')).toHaveLength(1);
    unmount();

    localStorage.clear();
    renderHome();
    await screen.findByTestId('home-empty');
    expect(screen.queryByRole('button', { name: '계약 추가' })).toBeNull();
    expect(screen.queryAllByTestId('ad-slot')).toHaveLength(0);
  });

  it('state 없이 진입해도 토스트가 없다', async () => {
    renderHome();
    await screen.findByTestId('home-empty');
    expect(mockOpenToast).not.toHaveBeenCalled();
  });
});

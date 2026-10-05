import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { mockAll, mockNavigate, mockOpenToast } from '@/__tests__/__helpers__/mocks';
import ContractEdit from '@/pages/ContractEdit';
import type { Contract } from '@/lib/types';

mockAll();

const KEY = 'renewwindow:contracts:v1';
const CONTRACT: Contract = {
  id: 'm1',
  nickname: '망원동 투룸',
  endDate: '2027-03-31',
  deposit: 200_000_000,
  monthlyRent: 0,
  renewalRightUsed: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const stored = (): Contract[] => JSON.parse(localStorage.getItem(KEY) ?? '[]');

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/contracts/new" element={<ContractEdit />} />
        <Route path="/contracts/:id/edit" element={<ContractEdit />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockOpenToast.mockClear();
  Element.prototype.scrollIntoView = () => {};
});

describe('ContractEdit', () => {
  it('신규 모드: 제목 "계약 등록"과 전체폭 저장 CTA, 삭제 버튼 없음', async () => {
    renderAt('/contracts/new');
    expect(await screen.findByText('계약 등록')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '계약 삭제' })).toBeNull();
  });

  it('수정 모드: 기존 값을 채우고 삭제 버튼을 보인다', async () => {
    localStorage.setItem(KEY, JSON.stringify([CONTRACT]));
    renderAt('/contracts/m1/edit');
    expect(await screen.findByText('계약 수정')).toBeInTheDocument();
    expect((screen.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('망원동 투룸');
    expect(screen.getByRole('button', { name: '계약 삭제' })).toBeInTheDocument();
  });

  it('수정 모드: 값을 바꿔 저장하면 1건 그대로 갱신하고 replace 이동한다', async () => {
    localStorage.setItem(KEY, JSON.stringify([CONTRACT]));
    renderAt('/contracts/m1/edit');
    await screen.findByText('계약 수정');
    fireEvent.change(screen.getAllByRole('textbox')[2], { target: { value: '180000000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(stored()).toHaveLength(1);
    expect(stored()[0].deposit).toBe(180_000_000);
    expect(mockNavigate).toHaveBeenCalledWith('/contracts/m1', { replace: true, state: { justSaved: true } });
  });

  it('없는 id: 폼 없이 NotFoundState만 보인다', async () => {
    renderAt('/contracts/abc/edit');
    expect(await screen.findByText('계약을 찾을 수 없어요')).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});

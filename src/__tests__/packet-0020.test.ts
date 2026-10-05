import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockTds, mockAppsInToss, mockAnalytics, mockOpenToast } from '@/__tests__/__helpers__/mocks';
import App from '@/App';

// 라우터는 목킹하지 않는다 — 실제 화면 이동으로 전체 흐름을 검증한다.
mockTds();
mockAppsInToss();
mockAnalytics();

vi.mock('@/components/AdSlot', () => ({
  AdSlot: () => React.createElement('div', { 'data-testid': 'ad-slot' }),
}));

// ── 컴플라이언스 스캔 ──
const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'test' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

function hits(re: RegExp): string[] {
  return walk(SRC).flatMap((f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => (re.test(line) ? `${path.relative(SRC, f)}:${i + 1}: ${line.trim()}` : ''))
      .filter(Boolean),
  );
}

describe('검수 컴플라이언스 점검·전체 흐름 E2E·빌드 타깃', () => {
  it('AC-1: 소스에 HEX 색상 리터럴이 0건이다', () => {
    expect(walk(SRC).length).toBeGreaterThan(10);
    expect(hits(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
  });

  it('AC-1: 설치 유도·다운로드·외부 이탈·외부 분석 SDK가 0건이다', () => {
    expect(hits(/앱을 설치하세요/)).toEqual([]);
    expect(hits(/다운로드/)).toEqual([]);
    expect(hits(/window\.open|window\.location\.href/)).toEqual([]);
    expect(hits(/from\s+['"](react-ga|@amplitude)/)).toEqual([]);
  });

  it('AC-1: Android 7 비호환 API(.at(, structuredClone, type="date")와 \'취소\' 버튼 문구가 0건이다', () => {
    expect(hits(/\.at\(/)).toEqual([]);
    expect(hits(/structuredClone/)).toEqual([]);
    expect(hits(/type=["']date["']/)).toEqual([]);
    expect(hits(/['"`>]\s*취소\s*['"`<]/)).toEqual([]);
  });

  describe('전체 흐름', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-06T09:00:00+09:00'));
      Element.prototype.scrollIntoView = vi.fn();
      mockOpenToast.mockClear();
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => errorSpy.mockRestore());

    const change = (label: RegExp, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } });

    async function registerContract() {
      render(
        React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(App)),
      );
      fireEvent.click(await screen.findByRole('button', { name: '첫 계약 등록하기' }));
      change(/계약 이름/, '망원동 투룸');
      change(/만기일/, '20270331');
      change(/현재 보증금/, '200000000');
      change(/현재 월세/, '500000');
      expect((screen.getByLabelText(/만기일/) as HTMLInputElement).value).toBe('2027-03-31');
      fireEvent.click(screen.getByRole('button', { name: '저장' }));
    }

    it('AC-2: 홈 → 계약 등록 → 저장하면 토스트와 결과 값이 보인다', async () => {
      await registerContract();
      await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith('계약을 저장했어요'));
      expect(await screen.findByText('D-117')).toBeInTheDocument();
      expect(screen.getByText('요구 마감 2027-01-31')).toBeInTheDocument();
      expect(screen.getByText('2억 1,000만원')).toBeInTheDocument();
      expect(screen.getByText('52만 5,000원')).toBeInTheDocument();
      const saved = JSON.parse(localStorage.getItem('renewwindow:contracts:v1') ?? '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ nickname: '망원동 투룸', endDate: '2027-03-31', deposit: 200_000_000, monthlyRent: 500_000 });
    });

    it('AC-3: 통보 점검에서 상한 초과 결과가 보이고 console.error는 0회다', async () => {
      await registerContract();
      fireEvent.click(await screen.findByText('집주인 인상 통보 점검하기'));
      fireEvent.click(await screen.findByRole('tab', { name: '새 금액으로 입력' }));
      change(/통보일/, '20261220');
      change(/새 보증금/, '216000000');
      change(/새 월세/, '550000');
      fireEvent.click(screen.getByRole('button', { name: '점검하기' }));
      expect(await screen.findByTestId('notice-result')).toBeInTheDocument();
      expect(screen.getAllByText('상한 초과').length).toBeGreaterThan(0);
      expect(screen.getByText('보증금 8.00% 인상 · 600만원 초과')).toBeInTheDocument();
      expect(errorSpy).toHaveBeenCalledTimes(0);
    });
  });

  it("AC-4: vite.config.ts의 build.target은 'es2017'이고 rollup external이 없다", () => {
    const text = fs.readFileSync(path.resolve(SRC, '../vite.config.ts'), 'utf8').replace(/\/\/.*$/gm, '');
    expect(text).toMatch(/build:\s*\{[\s\S]*target:\s*['"]es2017['"]/);
    expect(text).not.toMatch(/external/);
  });
});

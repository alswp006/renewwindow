import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useParams } from 'react-router-dom';
import App from '@/App';
import { paths } from '@/constants/routes';

// App.tsx의 라우팅 표만 검증한다 — 각 페이지 내용은 페이지별 테스트가 본다.
function stub(name: string) {
  return function Stub() {
    const { id } = useParams<{ id?: string }>();
    return React.createElement('div', { 'data-testid': `page-${name}` }, id ?? '');
  };
}

vi.mock('@/pages/Home', () => ({ default: stub('home') }));
vi.mock('@/pages/ContractEdit', () => ({ default: stub('contract-edit') }));
vi.mock('@/pages/Result', () => ({ default: stub('result') }));
vi.mock('@/pages/Notice', () => ({ default: stub('notice') }));

function LocationProbe() {
  return React.createElement('div', { 'data-testid': 'probe' }, useLocation().pathname);
}

function renderAt(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

describe('App 라우팅', () => {
  it("'/'는 홈을 렌더한다", () => {
    renderAt(paths.home());
    expect(screen.getByTestId('page-home')).toBeInTheDocument();
  });

  it("'/contracts/new'는 계약 입력 화면이고 결과 화면(:id='new')으로 매칭되지 않는다", () => {
    renderAt(paths.newContract());
    expect(screen.getByTestId('page-contract-edit')).toHaveTextContent('');
    expect(screen.queryByTestId('page-result')).not.toBeInTheDocument();
  });

  it("'/contracts/:id'는 결과 화면에 id를 넘긴다", () => {
    renderAt(paths.contract('c1'));
    expect(screen.getByTestId('page-result')).toHaveTextContent('c1');
  });

  it("'/contracts/:id/edit'는 계약 입력 화면에 id를 넘긴다", () => {
    renderAt(paths.editContract('c1'));
    expect(screen.getByTestId('page-contract-edit')).toHaveTextContent('c1');
  });

  it("'/contracts/:id/notice'는 통보 점검 화면을 렌더한다", () => {
    renderAt(paths.notice('c1'));
    expect(screen.getByTestId('page-notice')).toHaveTextContent('c1');
  });

  it.each(['/unknown', '/contracts/c1/zzz'])("알 수 없는 경로 '%s'는 홈으로 이동한다", (path) => {
    renderAt(path);
    expect(screen.getByTestId('page-home')).toBeInTheDocument();
    expect(screen.getByTestId('probe')).toHaveTextContent(/^\/$/);
  });
});

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// 토스 검수 컴플라이언스 스캔 — src/**/*.{ts,tsx}에서 테스트 파일·테스트 폴더·.d.ts를 뺀 앱 소스만 본다.
const SRC = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'test' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
  });
}

/** 패턴에 걸린 줄을 "파일:줄: 내용"으로 돌려준다 — 실패 메시지가 곧 고칠 위치다. */
function hits(re: RegExp): string[] {
  return walk(SRC).flatMap((f) =>
    fs
      .readFileSync(f, 'utf8')
      .split('\n')
      .map((line, i) => (re.test(line) ? `${path.relative(SRC, f)}:${i + 1}: ${line.trim()}` : ''))
      .filter(Boolean),
  );
}

describe('검수 컴플라이언스 스캔', () => {
  it('스캔 대상이 실제 앱 소스다(테스트 파일 제외)', () => {
    const files = walk(SRC).map((f) => path.relative(SRC, f));
    expect(files.length).toBeGreaterThan(10);
    expect(files).toContain('App.tsx');
    expect(files.some((f) => /\.test\.tsx?$/.test(f))).toBe(false);
    expect(files.some((f) => f.startsWith('test' + path.sep) || f.startsWith('__tests__' + path.sep))).toBe(false);
  });

  it('HEX 색상 리터럴이 0건이다 — 다크 모드는 var(--adaptive*)로만', () => {
    expect(hits(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
  });

  it('앱 설치 유도·다운로드 문구가 0건이다', () => {
    expect(hits(/앱을 설치하세요/)).toEqual([]);
    expect(hits(/다운로드/)).toEqual([]);
  });

  it('외부 이탈(window.open · window.location.href)이 0건이다', () => {
    expect(hits(/window\.open/)).toEqual([]);
    expect(hits(/window\.location\.href/)).toEqual([]);
  });

  it('외부 분석 SDK(react-ga · @amplitude) import가 0건이다', () => {
    expect(hits(/from\s+['"](react-ga|@amplitude)/)).toEqual([]);
    expect(hits(/import\(\s*['"](react-ga|@amplitude)/)).toEqual([]);
  });

  it('Android 7 비호환 API(.at( · structuredClone)가 0건이다', () => {
    expect(hits(/\.at\(/)).toEqual([]);
    expect(hits(/structuredClone/)).toEqual([]);
  });

  it('네이티브 날짜 입력(type="date")이 0건이다', () => {
    expect(hits(/type=["']date["']/)).toEqual([]);
  });

  it("'취소' 버튼 문구가 0건이다 — 다이얼로그 왼쪽 버튼은 '닫기'", () => {
    expect(hits(/['"`>]\s*취소\s*['"`<]/)).toEqual([]);
  });
});

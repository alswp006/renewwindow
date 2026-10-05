import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveResult } from '@/lib/types';
import { loadChecklist, saveChecklist } from '@/lib/settingsStorage';

export interface UseChecklistResult {
  checkedIds: string[];
  toggle: (itemId: string, on: boolean) => SaveResult;
}

export function useChecklist(contractId: string): UseChecklistResult {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  // 연속 토글에서도 최신 값을 기준으로 저장하도록 ref에 같이 둔다.
  const latest = useRef<string[]>([]);

  useEffect(() => {
    let loaded: string[] = [];
    try {
      loaded = loadChecklist()[contractId] ?? [];
    } catch {
      loaded = [];
    }
    latest.current = loaded;
    setCheckedIds(loaded);
  }, [contractId]);

  const toggle = useCallback(
    (itemId: string, on: boolean): SaveResult => {
      const rest = latest.current.filter((id) => id !== itemId);
      const next = on ? [...rest, itemId] : rest;
      const result = saveChecklist(contractId, next);
      if (result.ok) {
        latest.current = next;
        setCheckedIds(next);
      }
      return result;
    },
    [contractId],
  );

  return { checkedIds, toggle };
}

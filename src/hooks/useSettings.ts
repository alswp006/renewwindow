import { useCallback, useEffect, useState } from 'react';
import type { SaveResult, Settings } from '@/lib/types';
import { DEFAULT_BASE_RATE, DEFAULT_BASE_RATE_AS_OF } from '@/constants/law';
import { loadSettings, saveSettings } from '@/lib/settingsStorage';

export interface UseSettingsResult {
  settings: Settings;
  saveBaseRate: (percent: number, today: string) => SaveResult;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>({
    baseRatePercent: DEFAULT_BASE_RATE,
    baseRateAsOf: DEFAULT_BASE_RATE_AS_OF,
  });

  useEffect(() => {
    try {
      setSettings(loadSettings());
    } catch {
      // 읽기 실패 시 기본값 유지
    }
  }, []);

  const saveBaseRate = useCallback((percent: number, today: string): SaveResult => {
    const next: Settings = { baseRatePercent: percent, baseRateAsOf: today };
    const result = saveSettings(next);
    if (result.ok) setSettings(next);
    return result;
  }, []);

  return { settings, saveBaseRate };
}

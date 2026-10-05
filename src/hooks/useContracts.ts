import { useCallback, useEffect, useState } from 'react';
import type { Contract, SaveResult } from '@/lib/types';
import {
  deleteContract,
  getContract,
  loadContracts,
  saveContract,
  type ContractDraft,
  type SaveContractResponse,
} from '@/lib/storage';

export type ContractsStatus = 'loading' | 'ready' | 'error';

export interface UseContractsResult {
  status: ContractsStatus;
  contracts: Contract[];
  recovered: boolean;
  reload: () => void;
}

export function useContracts(): UseContractsResult {
  const [status, setStatus] = useState<ContractsStatus>('loading');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [recovered, setRecovered] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // 저장소 읽기를 다음 마이크로태스크로 미뤄 첫 렌더·첫 커밋이 항상 loading으로 보이게 한다.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const result = loadContracts();
        setContracts(result.contracts);
        setRecovered(result.recovered);
        setStatus('ready');
      } catch {
        setContracts([]);
        setRecovered(false);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => {
    setStatus('loading');
    setTick((t) => t + 1);
  }, []);

  return { status, contracts, recovered, reload };
}

export type ContractStatus = 'loading' | 'ready' | 'not_found';

export interface UseContractResult {
  status: ContractStatus;
  contract: Contract | undefined;
  save: (draft: ContractDraft) => SaveContractResponse;
  remove: () => SaveResult;
}

export function useContract(id: string): UseContractResult {
  const [status, setStatus] = useState<ContractStatus>('loading');
  const [contract, setContract] = useState<Contract | undefined>(undefined);

  useEffect(() => {
    setStatus('loading');
    let found: Contract | undefined;
    try {
      found = getContract(id);
    } catch {
      found = undefined;
    }
    setContract(found);
    setStatus(found ? 'ready' : 'not_found');
  }, [id]);

  const save = useCallback(
    (draft: ContractDraft): SaveContractResponse => {
      const result = saveContract({ ...draft, id });
      if (result.ok) {
        let next = result.contract;
        if (!next) {
          try {
            next = getContract(id);
          } catch {
            next = undefined;
          }
        }
        if (next) {
          setContract(next);
          setStatus('ready');
        }
      }
      return result;
    },
    [id],
  );

  const remove = useCallback((): SaveResult => deleteContract(id), [id]);

  return { status, contract, save, remove };
}

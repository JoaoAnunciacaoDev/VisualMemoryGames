import { useState, type SetStateAction } from 'react';
import type { TierListEditorData } from '@/services/tierlistEditor';
import {
  createEditorState,
  type GameItem,
  type Tier,
} from './types';

function resolveValue<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === 'function'
    ? (value as (previous: T) => T)(current)
    : value;
}

export function useTierListEditorState(initialData: TierListEditorData | null) {
  const [dataSource, setDataSource] = useState(initialData);
  const [state, setState] = useState(() => createEditorState(initialData));

  if (initialData !== dataSource) {
    setDataSource(initialData);
    setState(createEditorState(initialData));
  }

  const setTitle = (title: string) => setState((current) => ({ ...current, title }));
  const setIsPublic = (isPublic: boolean) =>
    setState((current) => ({ ...current, isPublic }));
  const setTiers = (value: SetStateAction<Tier[]>) =>
    setState((current) => ({
      ...current,
      tiers: resolveValue(value, current.tiers),
    }));
  const setGames = (value: SetStateAction<Record<string, GameItem[]>>) =>
    setState((current) => ({
      ...current,
      games: resolveValue(value, current.games),
    }));

  return { ...state, setTitle, setIsPublic, setTiers, setGames };
}

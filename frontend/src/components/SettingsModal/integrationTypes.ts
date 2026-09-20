import type {
  IntegrationAction,
  IntegrationMutationResult,
} from '@/features/integrations/mutations';
import type { ToastType } from '@/hooks/useToast';

export type IntegrationProvider = 'steam' | 'gog' | 'itch';

export type IntegrationRunner = (
  action: IntegrationAction,
) => Promise<IntegrationMutationResult>;

export type SettingsErrorSetter = (message: string) => void;

export type ToastPresenter = (message: string, type?: ToastType) => void;

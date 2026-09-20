import type { SettingsTab } from './settingsTypes';
import styles from './SettingsModal.module.css';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Nome de Usuário' },
  { id: 'password', label: 'Alterar Senha' },
  { id: 'deactivate', label: 'Excluir Conta' },
  { id: 'integrations', label: 'Integrações' },
];

interface SettingsTabsProps {
  activeTab: SettingsTab;
  disabled: boolean;
  onChange: (tab: SettingsTab) => void;
}

export default function SettingsTabs({ activeTab, disabled, onChange }: SettingsTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Configurações de conta">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
          onClick={() => onChange(tab.id)}
          disabled={disabled}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

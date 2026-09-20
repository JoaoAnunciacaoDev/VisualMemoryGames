import { describe, expect, it } from 'vitest';
import { EPIC_EXPORT_SCRIPT, parseEpicContent } from '@/components/SettingsModal/epicImport';

describe('parseEpicContent', () => {
  it('normaliza espaços, linhas vazias e finais de linha do Windows', () => {
    expect(parseEpicContent('  Control  \r\n\r\nDeath Stranding\r\n')).toEqual([
      'Control',
      'Death Stranding',
    ]);
  });

  it('ignora o cabeçalho CSV e remove aspas externas', () => {
    expect(parseEpicContent('"game"\n"Alan Wake 2"\n"Hades"')).toEqual([
      'Alan Wake 2',
      'Hades',
    ]);
  });

  it('desescapa aspas CSV e remove títulos duplicados preservando a ordem', () => {
    expect(parseEpicContent('"Tom Clancy""s The Division"\nControl\nControl')).toEqual([
      'Tom Clancy"s The Division',
      'Control',
    ]);
  });

  it('mantém o script de exportação pronto para copiar', () => {
    expect(EPIC_EXPORT_SCRIPT).toContain('EpicGamesLibrary.txt');
    expect(EPIC_EXPORT_SCRIPT).toContain('ajaxGetOrderHistory');
  });
});

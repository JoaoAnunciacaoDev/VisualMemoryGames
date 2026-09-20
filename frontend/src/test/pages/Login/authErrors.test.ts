import { describe, expect, it } from 'vitest';
import { parseAuthError } from '@/pages/Login/authErrors';

describe('parseAuthError', () => {
  it('preserva mensagens textuais da API', () => {
    expect(parseAuthError({ response: { data: { detail: 'Credenciais inválidas.' } } })).toBe(
      'Credenciais inválidas.',
    );
  });

  it('traduz erros de tamanho e campos obrigatórios', () => {
    const error = {
      response: {
        data: {
          detail: [
            { msg: 'String should have at least 8 characters', loc: ['body', 'password'] },
            { msg: 'Field required', loc: ['body', 'email'] },
          ],
        },
      },
    };

    expect(parseAuthError(error)).toBe(
      'A senha deve ter pelo menos 8 caracteres.\nO e-mail é obrigatório.',
    );
  });

  it('usa uma mensagem segura para formatos desconhecidos', () => {
    expect(parseAuthError(new Error('falha'))).toBe('Ocorreu um erro no servidor.');
  });
});

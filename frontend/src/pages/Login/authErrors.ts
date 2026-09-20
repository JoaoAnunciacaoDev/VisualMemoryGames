interface ValidationDetail {
  msg: string;
  loc?: Array<string | number>;
}

interface BackendError {
  response?: {
    data?: {
      detail?: string | ValidationDetail[];
    };
  };
}

const fieldLabel = (location: Array<string | number>) => {
  if (location.includes('password')) return 'A senha';
  if (location.includes('username')) return 'O nome de usuário';
  if (location.includes('email')) return 'O e-mail';
  return 'O campo';
};

function translateValidationDetail({ msg, loc = [] }: ValidationDetail) {
  const label = fieldLabel(loc);
  const length = msg.match(/\d+/)?.[0] ?? '';

  if (msg.includes('should have at least')) {
    return `${label} deve ter pelo menos ${length} caracteres.`;
  }
  if (msg.includes('should have at most')) {
    return `${label} deve ter no máximo ${length} caracteres.`;
  }
  if (msg.includes('value is not a valid email')) return 'E-mail inválido.';
  if (msg.includes('Field required')) return `${label} é obrigatóri${label === 'A senha' ? 'a' : 'o'}.`;
  return msg.replace(/^Value error,\s*/i, '');
}

export function parseAuthError(error: unknown): string {
  const detail = (error as BackendError).response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(translateValidationDetail).join('\n');
  return 'Ocorreu um erro no servidor.';
}

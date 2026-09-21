interface PydanticErrorDetail {
  msg?: string;
  loc?: Array<string | number>;
}

interface ApiErrorDetail {
  response?: { data?: { detail?: string | PydanticErrorDetail[] } };
}

export function parseSettingsError(
  error: unknown,
  fallback = 'Ocorreu um erro no servidor.',
): string {
  const detail = (error as ApiErrorDetail).response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;

  return detail.map((item) => {
    const message = item.msg || '';
    const location = item.loc || [];
    const isPassword = ['password', 'new_password', 'current_password'].some((key) => location.includes(key));
    const isUsername = location.includes('username');
    const isEmail = location.includes('email');

    if (message.includes('should have at least')) {
      const length = message.match(/\d+/)?.[0] ?? '';
      if (isPassword) return `A senha deve ter pelo menos ${length} caracteres.`;
      if (isUsername) return `O nome de usuário deve ter pelo menos ${length} caracteres.`;
      return `O campo deve ter pelo menos ${length} caracteres.`;
    }
    if (message.includes('should have at most')) {
      const length = message.match(/\d+/)?.[0] ?? '';
      if (isUsername) return `O nome de usuário deve ter no máximo ${length} caracteres.`;
      if (isPassword) return `A senha deve ter no máximo ${length} caracteres.`;
      return `O campo deve ter no máximo ${length} caracteres.`;
    }
    if (message.includes('value is not a valid email')) return 'E-mail inválido.';
    if (message.includes('Field required')) {
      if (isPassword) return 'A senha é obrigatória.';
      if (isUsername) return 'O nome de usuário é obrigatório.';
      if (isEmail) return 'O e-mail é obrigatório.';
      return 'Campo obrigatório.';
    }
    return message.replace(/^Value error,\s*/i, '');
  }).join('\n');
}

import type { ErrorComponentProps } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Shared';

export function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  const retry = async () => {
    reset();
    await router.invalidate();
  };

  return (
    <main
      className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center"
      role="alert"
    >
      <AlertTriangle aria-hidden="true" className="text-amber-400" size={40} />
      <h1 className="text-2xl font-semibold">Não foi possível abrir esta página</h1>
      <p className="text-sm text-neutral-400">
        {error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'}
      </p>
      <Button type="button" onClick={() => void retry()}>
        Tentar novamente
      </Button>
    </main>
  );
}

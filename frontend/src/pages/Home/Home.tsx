import { useNavigate } from '@tanstack/react-router';
import { Button, PageTitle } from '@/components/Shared';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-[var(--gap-md)] px-[var(--gap-md)] text-center text-[var(--text)] max-[600px]:h-[40vh] max-[600px]:gap-[var(--gap-sm)]">
      <PageTitle level="h1">Bem-vindo ao VisualMemory</PageTitle>
      <p className="m-0 text-[length:var(--font-size-md)] text-[var(--muted)] max-[600px]:text-[length:var(--font-size-sm)]">Organize e acompanhe sua biblioteca de jogos.</p>
      <Button onClick={() => navigate({ to: '/login' })}>
        Entrar
      </Button>
    </div>
  );
}

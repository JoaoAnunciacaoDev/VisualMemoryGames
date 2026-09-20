import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { validatePatchNotesSearch } from '@/app/search';
import PatchNotes from '@/pages/PatchNotes/PatchNotes';

export const Route = createFileRoute('/patch-notes')({
  beforeLoad: requireAuth,
  validateSearch: validatePatchNotesSearch,
  component: PatchNotes,
});

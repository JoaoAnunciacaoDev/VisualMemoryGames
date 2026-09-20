import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { requireAuth } from '@/app/routeGuards';
import { PATCH_NOTES_SEARCH_DEFAULTS, validatePatchNotesSearch } from '@/app/search';
import PatchNotes from '@/pages/PatchNotes/PatchNotes';

export const Route = createFileRoute('/patch-notes')({
  beforeLoad: requireAuth,
  validateSearch: validatePatchNotesSearch,
  search: {
    middlewares: [stripSearchParams(PATCH_NOTES_SEARCH_DEFAULTS)],
  },
  component: PatchNotes,
});

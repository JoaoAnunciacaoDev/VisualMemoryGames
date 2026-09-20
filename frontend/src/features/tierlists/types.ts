import { z } from 'zod';

export const tierListCreateSchema = z.object({
  title: z.string().trim().min(1, 'Informe um nome para a Tier List.'),
  gameSource: z.enum(['empty', 'all', 'status', 'list']),
  selectedStatus: z.string(),
  selectedListId: z.string(),
  isPublic: z.boolean(),
}).superRefine((values, context) => {
  if (values.gameSource === 'list' && !values.selectedListId) {
    context.addIssue({
      code: 'custom',
      path: ['selectedListId'],
      message: 'Selecione uma lista personalizada.',
    });
  }
});

export type TierListCreateValues = z.infer<typeof tierListCreateSchema>;
export type TierListGameSource = TierListCreateValues['gameSource'];

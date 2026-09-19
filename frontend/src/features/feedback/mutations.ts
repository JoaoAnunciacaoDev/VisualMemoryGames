import api from '@/services/api';

export const submitFeedback = (input: { title: string; description: string }) =>
  api.post('/users/feedback', input);

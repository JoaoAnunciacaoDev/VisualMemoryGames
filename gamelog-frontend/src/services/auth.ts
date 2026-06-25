export const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const getToken = () => localStorage.getItem('token');

export const clearToken = () => localStorage.removeItem('token');
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function getHealth(): Promise<{ status: string; time: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(`Backend trả về ${res.status}`);
  return res.json();
}

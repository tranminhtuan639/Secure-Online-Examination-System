import { useEffect, useState } from 'react';
import { API_URL, getHealth } from './api';

type State =
  { kind: 'loading' } | { kind: 'ok'; time: string } | { kind: 'error'; message: string };

export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    getHealth()
      .then((h) => setState({ kind: 'ok', time: h.time }))
      .catch((e: Error) => setState({ kind: 'error', message: e.message }));
  }, []);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 560,
        margin: '4rem auto',
        padding: '0 1rem',
      }}
    >
      <h1>Secure Exam</h1>
      <p>Khung dự án đã chạy. Kết nối tới backend: {API_URL}</p>
      {state.kind === 'loading' && <p>Đang kiểm tra backend…</p>}
      {state.kind === 'ok' && <p>Backend hoạt động (giờ server: {state.time}).</p>}
      {state.kind === 'error' && (
        <p>
          Không kết nối được backend: {state.message}. Kiểm tra backend đã chạy và CORS_ORIGINS.
        </p>
      )}
    </main>
  );
}

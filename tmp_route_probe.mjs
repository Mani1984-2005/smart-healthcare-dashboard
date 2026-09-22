import { app } from './backend/server.js';

const server = app.listen(0, async () => {
  const { port } = server.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/patients/1`, {
      headers: { Authorization: 'Bearer test-token-PATIENT-1' },
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (err) {
    console.error('FETCH_ERR', err);
  } finally {
    server.close();
  }
});

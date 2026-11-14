import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Read the repo-root .env (all variables, not just VITE_*). Only used by this config.
  const env = loadEnv(mode, '../..', '');
  const api = `http://127.0.0.1:${env.API_PORT || 3000}`;
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.HOST || '0.0.0.0',
      port: Number(env.WEB_PORT) || 5173,
      strictPort: true,
      allowedHosts: (env.WEB_ALLOWED_HOSTS ?? '').split(',').filter(Boolean),
      // Same-origin in dev: the phone only talks to Vite, which forwards to the API.
      proxy: { '/api': api, '/uploads': api },
    },
  };
});

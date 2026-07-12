import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detectar si estamos en Docker por variable de entorno o por la presencia del archivo .dockerenv
const isDocker = process.env.DOCKER_CONTAINER === 'true' || process.env.NODE_ENV === 'docker';
const apiTarget = isDocker ? 'http://backend:8000' : 'http://localhost:8000';

const proxyConfig = {
  target: apiTarget,
  changeOrigin: true,
  secure: false,
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
      // Set the Host header appropriately based on target
      proxyReq.setHeader('Host', isDocker ? 'backend:8000' : 'localhost:8000');
      proxyReq.setHeader('x-forwarded-host', isDocker ? 'backend:8000' : 'localhost:8000');
      proxyReq.setHeader('x-forwarded-proto', 'http');
      proxyReq.setHeader('x-forwarded-for', req.ip || '127.0.0.1');
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': proxyConfig,
    },
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Le .env vit à la RACINE du projet et est partagé avec Django : un seul
// fichier à renseigner. On y relit les identifiants OAuth et on les expose
// au frontend, sans avoir à dupliquer les variables en VITE_*.
const rootDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '') // '' = charge aussi les variables non préfixées

  const expose = (...names) => JSON.stringify(names.map((n) => env[n]).find(Boolean) || '')

  return {
    plugins: [react()],
    envDir: rootDir,
    define: {
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': expose('VITE_GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID'),
      'import.meta.env.VITE_FACEBOOK_APP_ID': expose('VITE_FACEBOOK_APP_ID', 'FACEBOOK_APP_ID'),
    },
    // En dev, on proxifie l'API vers Django (comme le fait nginx en prod) :
    // le navigateur n'appelle que des chemins relatifs (/api…).
    server: {
      proxy: {
        '/api': 'http://localhost:8000',
        '/admin': 'http://localhost:8000',
        '/static': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
        '/accounts': 'http://localhost:8000',
      },
    },
  }
})

import { defineConfig, loadEnv } from 'vite'

function obfuscate(str) {
  const encoded = Array.from(str).map(c => c.charCodeAt(0)).join(',')
  return `String.fromCharCode(${encoded})`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const keys = [
    'VITE_FB_APIKEY',
    'VITE_FB_AUTHDOMAIN',
    'VITE_FB_PROJECTID',
    'VITE_FB_STORAGEBUCKET',
    'VITE_FB_MESSAGINGSENDERID',
    'VITE_FB_APPID',
    'VITE_FB_MEASUREMENTID',
  ]

  return {
    define: Object.fromEntries(
      keys.map(k => [k, JSON.stringify(obfuscate(env[k] || ''))])
    ),
  }
})

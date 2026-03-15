# GameBet - Ajedrez con Apuestas Crypto

App de ajedrez con frontend React/Vite y un backend FastAPI para el coach historico, el motor y el analisis post-partida.

## Tecnologias

- Frontend: Vite, React, TypeScript
- Estilos: Tailwind CSS, shadcn/ui, Framer Motion
- Blockchain: Ethers.js
- Backend/Base de datos: FastAPI, SQLAlchemy, Supabase
- Motor: Stockfish

## Configuracion local

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd exo-stellar
   ```
2. Instala dependencias del frontend:
   ```bash
   npm install
   ```
3. Crea `.env` con tus credenciales:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `GEMINI_API_KEY`
   - Puedes partir de `.env.example`.
4. Levanta frontend y backend:
   ```bash
   npm run dev:web
   cd coach-engine
   python run_server.py
   ```

## Despliegue recomendado

### Frontend en Cloudflare Pages

- Framework preset: `React (Vite)`
- Build command: `npm install && npm run build`
- Build output directory: `dist`
- Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_COACH_API_URL`

`VITE_COACH_API_URL` debe apuntar a la URL base publica del backend, por ejemplo `https://gamechess-coach-engine.onrender.com`.

### Backend en Render

El repositorio ya incluye:

- [render.yaml](C:/Users/patri/.gemini/antigravity/playground/exo-stellar/render.yaml)
- [Dockerfile](C:/Users/patri/.gemini/antigravity/playground/exo-stellar/coach-engine/Dockerfile)

Variables necesarias en Render:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `CORS_ALLOWED_ORIGINS`

Ejemplo de `CORS_ALLOWED_ORIGINS`:

```text
https://chessbet.pages.dev
```

## Notas

- En local, Vite hace proxy de `/api` hacia `127.0.0.1:8000`.
- En produccion, Cloudflare Pages solo publica el frontend. El coach-engine debe vivir en un servicio aparte.
- El backend ahora detecta Stockfish por variable `STOCKFISH_PATH` o por rutas comunes de Linux, asi que puede desplegarse en Render sin depender del `.exe` de Windows.
- `coach-engine/coach.db` ahora forma parte del repositorio para que GitHub Desktop suba tambien la base local del backend.
- `.env` sigue fuera del repositorio por seguridad. Si quieres clonar el proyecto completo en otra maquina, copia `.env.example` a `.env` y pega tus claves reales.

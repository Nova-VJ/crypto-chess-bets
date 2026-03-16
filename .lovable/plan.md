

# Plan: Completar el flujo end-to-end de partida + migrar coach backend a Edge Functions

## Estado actual

El proyecto ya tiene:
- Edge Functions funcionando para `chess-move`, `chess-chat`, `chess-evaluate`, `wiki-profile`
- Tablas Supabase para lobby, games, profiles, etc.
- Frontend completo con lobby, crear partida, play, historical play, coach AI
- Smart contract V2 desplegado en BSC

Lo que falta o está roto:
1. La tabla `games` no tiene columnas `moves`, `contract_game_id`, `payment_method`, `currency`
2. `AcceptanceModal` no copia esos campos del lobby al game
3. `settleGameOnChain` nunca se llama al terminar
4. No hay liquidación interna de balances
5. El backend FastAPI (coach-engine) tiene funcionalidad rica que las Edge Functions actuales solo replican parcialmente
6. Faltan tablas para la memoria del coach: `coach_memory_profiles`, `coach_relationships`, `coach_reference_log`, `master_games`, `knowledge_sources/units`
7. El perfil de profiles no tiene campos como `balance_usdt`, `rating_bullet`, `rating_blitz`, `rating_rapid`, `wins`, `losses`, `draws`, `country_code`, `settings`

## Fase 1: Migración de base de datos

Agregar a `games`:
- `moves jsonb DEFAULT '[]'`
- `contract_game_id text`
- `payment_method text DEFAULT 'internal'`
- `currency text DEFAULT 'BNB'`

Agregar a `profiles`:
- `balance_usdt numeric DEFAULT 0`
- `rating_bullet integer DEFAULT 1200`
- `rating_blitz integer DEFAULT 1200`
- `rating_rapid integer DEFAULT 1200`
- `wins integer DEFAULT 0`
- `losses integer DEFAULT 0`
- `draws integer DEFAULT 0`
- `country_code text`
- `settings jsonb DEFAULT '{}'`
- `xp integer DEFAULT 0`
- `level integer DEFAULT 1`

Crear nuevas tablas:
- `coach_memory_profiles` (user_id, coach_id, summary_json, updated_at)
- `coach_relationships` (user_id, coach_id, strengths_json, weaknesses_json, last_topic, notes)
- `coach_reference_log` (user_id, coach_id, source_type, source_key, session_token, game_id, cited_at)
- `master_games` (white, black, result, event, date, opening, eco, pgn, fen_list)
- `knowledge_sources` (title, author, license_type)
- `knowledge_units` (source_id, concept_name, phase, explanation, triggers, anti_patterns, example_fen, recommended_drill)
- `coach_game_sessions` (user_id, coach_id, session_token, pgn, result, opening, eco, opening_family, time_control, rating, review, neuro_metrics, user_color, created_at)

Con RLS policies y realtime habilitado donde corresponda.

## Fase 2: Fix AcceptanceModal

Copiar del lobby al game: `contract_game_id`, `payment_method`, `currency`.

## Fase 3: Settlement en Play.tsx

Cuando una partida termina (checkmate, resign, timeout):
- Si `payment_method === 'web3'` y existe `contract_game_id`: llamar `settleGameOnChain`
- Si `payment_method === 'internal'`: actualizar balances en profiles
- Actualizar stats (wins/losses/draws, rating) en profiles

## Fase 4: Mejorar Edge Functions del coach

### chess-chat mejorado
- Integrar memoria persistente usando las nuevas tablas de Supabase (coach_memory_profiles, coach_conversations, coach_reference_log)
- Recuperar recuerdos relevantes por scoring (como hace el FastAPI)
- Buscar referencias históricas en master_games
- Consultar Lichess Explorer para posiciones de apertura
- Persistir interacciones
- Refrescar memory profiles en background

### chess-move mejorado
- Mantener el enfoque AI actual (funciona bien sin Stockfish server-side)
- Nota: Stockfish no puede ejecutarse en Edge Functions (es un binario nativo). El chess-move actual usa la AI Gateway como motor, que ya produce jugadas de alta calidad por persona. Esto es la mejor alternativa equivalente dentro de Lovable.

### chess-evaluate mejorado
- Integrar persistencia en coach_game_sessions
- Actualizar XP/nivel del perfil
- Refrescar memory profiles

### Nuevas Edge Functions
- `coach-history`: GET historial de partidas y sesiones del coach
- `coach-insights`: GET insights analíticos del usuario
- `coach-master-profile`: GET perfil del maestro con stats y wiki

## Fase 5: Frontend - Conectar todo

- `Play.tsx`: agregar settlement automático
- `AcceptanceModal.tsx`: copiar campos del lobby
- `HistoricalPlay.tsx`: conectar con edge functions mejoradas
- `coachApi.ts`: agregar funciones para las nuevas edge functions
- `Profile.tsx`: usar nuevos campos del perfil

## Archivos a crear/modificar

**Crear:**
- 1 migración SQL (todas las tablas y columnas)
- `supabase/functions/coach-history/index.ts`
- `supabase/functions/coach-insights/index.ts`  
- `supabase/functions/coach-master-profile/index.ts`

**Modificar:**
- `supabase/functions/chess-chat/index.ts` (memoria persistente)
- `supabase/functions/chess-evaluate/index.ts` (persistencia + stats)
- `supabase/config.toml` (nuevas funciones)
- `src/components/AcceptanceModal.tsx` (copiar campos)
- `src/pages/Play.tsx` (settlement)
- `src/lib/coachApi.ts` (nuevas funciones)
- `src/lib/contract.ts` (verificar settleGameOnChain existe)

## Nota sobre Stockfish

Stockfish es un binario nativo C++ que no puede ejecutarse en Edge Functions (Deno). El enfoque actual de usar la AI Gateway (Gemini/GPT) como motor de jugadas por persona ya funciona y produce movimientos de alta calidad con personalidad distinta por maestro. Este es el comportamiento equivalente óptimo dentro de la plataforma. Si en el futuro se necesita Stockfish puro, requeriría un servidor externo dedicado.

## Nota sobre secretos

Los env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` ya están configurados automáticamente. `LOVABLE_API_KEY` ya existe como secreto. No se necesita `GEMINI_API_KEY` porque usamos Lovable AI Gateway. Las variables de Wikimedia (`USER_AGENT`, `CACHE_TTL_HOURS`) se hardcodean en la edge function `wiki-profile` (ya implementado).


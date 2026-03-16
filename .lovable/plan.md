

# Plan: Reducir frecuencia de mensajes + Mejorar naturalidad conversacional

## Problema 1: Demasiados mensajes automáticos
El auto-commentary se dispara cada **8 jugadas** (`movesSinceLast >= 8`). Esto satura la conversación. Subir a **~20 jugadas** y añadir aleatorización para que no sea predecible.

## Problema 2: Fischer suena como un robot agresivo genérico
Los problemas de personalidad:
- **Siempre agresivo sin matices** — Fischer real era obsesivo pero también vulnerable, solitario, con momentos de humor seco
- **No escucha al usuario** — ignora lo que dice y repite "mueve" como loop
- **Respuestas genéricas** — "los rusos", "mueve", "no pierdas tiempo" en bucle
- **No distingue contexto** — pre-game vs in-game deberían tener tono diferente

## Cambios

### 1. `src/pages/HistoricalPlay.tsx` — Reducir frecuencia de auto-commentary
- Cambiar `movesSinceLast >= 8` → `movesSinceLast >= 20`
- Añadir probabilidad del 60% (`Math.random() < 0.6`) para que no siempre comente
- Resultado: ~35% del volumen actual de mensajes automáticos

### 2. `supabase/functions/chess-chat/index.ts` — Mejorar prompts de personalidad

**Fischer** — Agregar matices reales:
- Contexto pre-partida: puede ser educado a su manera, hablar de Brooklyn, de su madre, de su obsesión por aprender idiomas
- No siempre agresivo — a veces reflexivo, melancólico, obsesivo-técnico
- **DEBE** responder a lo que el usuario dice, no ignorarlo
- Instrucción explícita: "Si el usuario te hace una pregunta personal, respóndela. Si te saluda, responde brevemente. NO repitas 'mueve' si no hay contexto de juego activo."

**Todos los maestros** — Agregar regla contextual:
- Pre-game (`interaction_mode: pre_game`): conversación relajada, pueden hablar de su vida
- In-game: más tensos, enfocados en la partida
- Post-game: reflexivos, analíticos

**Agregar instrucción de escucha activa**:
```
ESCUCHA ACTIVA:
- Lee el mensaje del usuario. Responde a LO QUE ÉL DIJO, no a lo que tú quieres decir.
- Si te saluda, responde al saludo con tu estilo.
- Si te hace una pregunta, respóndela.
- Si dice algo que no tiene sentido en el tablero, díselo con humor, no con agresión genérica.
- NUNCA digas "mueve" más de una vez por conversación.
```

### 3. Refinar el prompt del auto-commentary
El prompt actual dice "Haz un comentario natural..." — demasiado vago. Cambiar a variantes rotativas basadas en el `move_count` para forzar ángulos diferentes.

## Archivos a modificar
- `src/pages/HistoricalPlay.tsx` — frecuencia de commentary
- `supabase/functions/chess-chat/index.ts` — prompts de personalidad + regla de escucha activa + contexto por modo


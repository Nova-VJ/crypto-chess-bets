

# Plan: Conversaciones de nivel top en realismo — Anti-repetición radical

## Problema raíz

El modelo recibe todo el historial como **texto plano en el system prompt**, no como turnos reales de conversación. Resultado: no distingue lo que ya dijo de lo que puede decir → repite temas (soviéticos, Taimanov, pareja de alfiles) en bucle.

## Cambios en `supabase/functions/chess-chat/index.ts`

### 1. Enviar historial como turnos reales de `messages[]`

Actualmente todo va en el system prompt como `[HISTORIAL COMPLETO DE CONVERSACIONES]`. Cambiar a:

```text
messages: [
  { role: "system", content: systemPrompt },
  // Últimos 20 mensajes reales como turnos user/assistant
  { role: "user", content: "cual es tu anecdota favorita?" },
  { role: "assistant", content: "En 1956 contra Byrne..." },
  ...
  { role: "user", content: currentMessage }
]
```

El modelo así "recuerda" lo que dijo y no lo repite. El historial plano se elimina del system prompt.

### 2. Inyectar directiva anti-repetición dinámica

Extraer los temas/entidades mencionados en los últimos 10 mensajes del coach y agregarlos como lista prohibida:

```text
[TEMAS YA MENCIONADOS — NO REPETIR]
- soviéticos/rusos (mencionado 4 veces)
- Taimanov 1971 (mencionado 3 veces)  
- pareja de alfiles (mencionado 2 veces)
Si mencionas algo de esta lista, tu respuesta será descartada.
```

### 3. Reducir el peso del system prompt

El prompt actual tiene ~800 tokens de libros con triggers/anti-patrones. Esto causa que el modelo gravite siempre hacia los mismos temas. Cambio:

- Mover los detalles de libros al `memoryContext` (ya están en `knowledge_units` en BD)
- Dejar en el system prompt solo la **voz y personalidad** (~200 tokens)
- Los conceptos de libros llegan dinámicamente desde `knowledge_units` solo cuando son relevantes a la posición

### 4. Agregar variedad forzada con instrucción de creatividad

Agregar al prompt:

```text
VARIEDAD OBLIGATORIA:
- Cada mensaje debe tener un ángulo DIFERENTE: una vez habla de tu infancia, otra de un torneo, otra de la posición pura, otra de tu opinión sobre otro jugador, otra de algo fuera del ajedrez.
- NUNCA uses la misma estructura sintáctica dos veces seguidas.
- Si ya hablaste de un rival o evento, NO lo menciones de nuevo en los próximos 10 mensajes.
- Puedes quedarte en silencio (responder "") si no tienes nada genuinamente nuevo que decir.
```

### 5. Subir temperature a 0.85

De 0.7 → 0.85 para más variedad en las respuestas. Con los controles anti-repetición, el riesgo de incoherencia es bajo.

## Archivos

- **Modificar**: `supabase/functions/chess-chat/index.ts`
  - Reestructurar `messages[]` con turnos reales
  - Adelgazar system prompts (voz + reglas solamente)
  - Agregar extracción de temas ya usados → lista prohibida
  - Subir temperature a 0.85

## Resultado esperado

- Fischer no menciona "los soviéticos" más de 1 vez por partida
- Cada comentario tiene un ángulo diferente
- Las anécdotas no se reciclan
- La conversación fluye como entre dos personas reales


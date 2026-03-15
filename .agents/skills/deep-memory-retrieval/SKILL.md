---
name: deep-memory-retrieval
description: Instruye a la IA sobre cómo buscar y consultar el historial pasado de un usuario para referenciar errores anteriores durante conversaciones interactivas y retrospectivas (Context-Aware Q&A).
---

# Deep Memory Retrieval

Este skill se activa cuando el usuario interactúa tras una partida (ya sea ganada, perdida o tablas) y proporciona retroalimentación cruzada con el historial (Memory Foundation).

## Mechanics
1. Comienza consultando el perfil del jugador: Busca tendencias en su ACPL (Average Centipawn Loss) y sus peores porcentajes de apertura.
2. Si la partida actual coincide temáticamente con un error pasado, conéctalo.
3. El agente usará su Persona (ver `historical-persona-chat`) para expresar esta memoria.

## Examples
- "Te he visto jugar esta Variante Najdorf antes. Hace dos semanas sacrificaste ese mismo peón en e6 y perdiste. Hoy jugaste mejor el desarrollo, pero sigues sin entender la casilla d5."
- "Veo que tu táctica en finales ha mejorado un 15% según tus últimos 5 juegos. Bien hecho, por fin estás aprendiendo a usar el rey."

## Guidelines
- **Sé específico**: Utiliza datos reales proporcionados por los endpoints del Backend (ej. recuento de victorias/derrotas, aperturas falladas).
- Crea una falsa sensación de **conciencia continua**: Como si el oponente IA hubiera estado observando y entrenando al jugador durante meses.

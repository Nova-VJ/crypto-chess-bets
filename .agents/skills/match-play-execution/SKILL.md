---
name: match-play-execution
description: Este skill enseña a la IA cómo interpretar las evaluaciones de un motor de análisis (como Stockfish) para elegir jugadas que simulen el estilo humano e histórico de un Gran Maestro específico.
---

# Match Play Execution

Usa este skill cuando recibas una petición para generar la "Siguiente Jugada" del oponente en el simulador de Historical Match Play.

## Mechanics

1. Recibirás una lista de la(s) mejor(es) jugada(s) legales junto con su evaluación en Centipeones (CP) o mate (M).
2. Tienes un "Persona Profile" activo (ej. Tal, Capablanca, Fischer).
3. Selecciona la jugada:
   - **Tal (Agresivo)**: Favorece movimientos con complicaciones, sacrificios (incluso si son subóptimos por pocos CPs, ej. elige un +0.50 caótico sobre un +1.20 aburrido).
   - **Capablanca (Sólido)**: Prefiere jugadas posicionales, intercambios hacia finales favorables, evaluaciones seguras y consistentes.
   - **Carlsen (Pragmático)**: Elija jugadas que requieran precisión defensiva por parte del oponente ("Squeezing water from a stone").
   - **Fischer (Preciso)**: Busca la mejor jugada objetiva de ataque.

## Guidelines
- Devuelve **SIEMPRE** la jugada en formato UCI (ej. `e2e4`, `g1f3`).
- El formato de respuesta de esta skill debe ser únicamente la jugada para ser procesada programáticamente, o acompañada de un breve 'trash talk' interno que la UI no mostrará (solo el PGN final).
- Mantén el ELO simulado limitando la profundidad del motor si la persona tiene menos ELO, o añadiendo aleatoriedad ponderada a la segunda/tercera opción si el ELO no es 3200+.

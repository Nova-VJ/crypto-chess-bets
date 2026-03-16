

# Plan: Seeding masivo de partidas + Memoria sin límites + Knowledge base completa

## Estado actual

| Tabla | Registros | Problema |
|---|---|---|
| `master_games` | 25 (5 por maestro) | Insuficiente — los maestros jugaron miles |
| `knowledge_sources` | 0 | Vacía — los libros no están persistidos |
| `knowledge_units` | 0 | Vacía — los conceptos tácticos no están en BD |
| `chess-chat` master query | `.limit(5)` | Artificial — solo usa 5 partidas de referencia |

## Cambios

### 1. Edge function `seed-master-games` — Seeding masivo desde Lichess

Crear una edge function que consulte la **Lichess Masters Database API** (gratuita, sin auth):
- `https://explorer.lichess.ovh/masters?player=Fischer,Robert+James` → partidas OTB reales
- Iterar por cada maestro con su nombre completo
- Insertar en `master_games` con PGN, ECO, opening, event, date, coach_id
- Idempotente: skip si ya hay >50 partidas para ese coach_id
- Meta: **200+ partidas por maestro** (1000+ total)

Los nombres para la API:
- Fischer → `Fischer,Robert+James`
- Tal → `Tal,Mihail`  
- Capablanca → `Capablanca,Jose+Raul`
- Kasparov → `Kasparov,Garry`
- Carlsen → `Carlsen,Magnus`

### 2. Seed `knowledge_sources` + `knowledge_units` — Libros completos en BD

Poblar con INSERT las tablas de conocimiento basándose en el contenido ya codificado en los prompts de `chess-chat`:

**`knowledge_sources`** (~20 libros):
- Fischer: My 60 Memorable Games, Bobby Fischer Teaches Chess, Games of Chess, Checkmate
- Tal: Life and Games, Best Games, Tal-Botvinnik 1960
- Capablanca: Chess Fundamentals, A Primer of Chess, My Chess Career
- Kasparov: My Great Predecessors, Modern Chess, How Life Imitates Chess, Revolution in the 70s
- Carlsen: Endgame Virtuoso, Attack with Magnus Carlsen, 60 Memorable Games, Wonderboy

**`knowledge_units`** (~100+ conceptos):
Extraer cada concepto de los prompts como un registro individual con:
- `concept_name`: "Pareja de alfiles", "Mates en última fila", etc.
- `phase`: "opening" / "middlegame" / "endgame" / "general"
- `explanation`: La enseñanza completa
- `triggers`: Cuándo activar este concepto
- `anti_patterns`: Lo que NUNCA hacer
- `coach_id`: El maestro asociado
- `source_id`: Referencia al libro

### 3. Eliminar límites artificiales en `chess-chat`

- Cambiar `.limit(5)` en master_games query → sin límite (traer todas las del coach)
- Agregar consulta a `knowledge_units` filtrada por `coach_id` para enriquecer el contexto con conceptos relevantes de los libros
- La conversación ya no tiene límite (✅ correcto)
- El historial de partidas ya no tiene límite (✅ correcto)

### 4. Enriquecer `chess-chat` con knowledge_units

Agregar al pipeline de memoria:
```
// Fetch knowledge concepts for this coach
const knowledgeQuery = supabase
  .from("knowledge_units")
  .select("concept_name, phase, explanation, triggers, anti_patterns, example_fen")
  .eq("coach_id", persona);
```
Incluir estos conceptos en el prompt como `[BASE DE CONOCIMIENTO DEL MAESTRO]` para que tenga acceso individual a cada concepto.

## Archivos a crear/modificar

**Crear:**
- `supabase/functions/seed-master-games/index.ts` — Fetch masivo desde Lichess API

**Modificar:**
- `supabase/functions/chess-chat/index.ts` — Eliminar `.limit(5)`, agregar query a `knowledge_units`
- `supabase/config.toml` — Agregar `seed-master-games`

**Data inserts** (via insert tool, no migration):
- `knowledge_sources` — 20 libros
- `knowledge_units` — 100+ conceptos extraídos de los prompts

## Resultado

Cada maestro tendrá:
- **200+ partidas reales** accesibles en memoria
- **Todos sus libros** registrados como knowledge_sources
- **Todos los conceptos** de esos libros como knowledge_units individuales consultables
- **Sin límites** en las queries de memoria — acceso completo a todo el historial


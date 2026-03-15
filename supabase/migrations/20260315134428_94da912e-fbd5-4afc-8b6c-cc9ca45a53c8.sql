CREATE TABLE public.wiki_entity_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id text NOT NULL,
  lang text NOT NULL DEFAULT 'es',
  qid text,
  label text,
  description text,
  wikipedia_title text,
  wikipedia_summary text,
  birth_date text,
  death_date text,
  image text,
  wikidata_json jsonb DEFAULT '{}'::jsonb,
  extra_json jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE (coach_id, lang)
);

ALTER TABLE public.wiki_entity_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wiki cache"
  ON public.wiki_entity_cache
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage wiki cache"
  ON public.wiki_entity_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
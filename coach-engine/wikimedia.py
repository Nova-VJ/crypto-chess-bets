import datetime
import json
import os
import re
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.orm import Session

from database import WikiEntityCache

WIKIDATA_ACTION_API = "https://www.wikidata.org/w/api.php"
WDQS_ENDPOINT = "https://query.wikidata.org/sparql"


def _user_agent() -> str:
    return os.getenv("WIKIMEDIA_USER_AGENT", "GameChessCoach/1.0 (educacionxunfuturo@gmail.com)")


def _now_utc() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _cache_ttl_hours() -> int:
    try:
        return int(os.getenv("WIKIMEDIA_CACHE_TTL_HOURS", "168"))
    except Exception:
        return 168


def _safe_get(dct: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    current: Any = dct
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current


def _extract_time_claim(entity: Dict[str, Any], prop: str) -> Optional[str]:
    claims = entity.get("claims") or {}
    claim_list = claims.get(prop) or []
    if not claim_list:
        return None
    mainsnak = claim_list[0].get("mainsnak") or {}
    datavalue = mainsnak.get("datavalue") or {}
    value = datavalue.get("value") or {}
    time_value = value.get("time")
    if not time_value or not isinstance(time_value, str):
        return None
    match = re.match(r"^[+-](\d{4}-\d{2}-\d{2})", time_value)
    return match.group(1) if match else None


def _extract_commons_image(entity: Dict[str, Any]) -> Optional[str]:
    claims = entity.get("claims") or {}
    claim_list = claims.get("P18") or []
    if not claim_list:
        return None
    mainsnak = claim_list[0].get("mainsnak") or {}
    datavalue = mainsnak.get("datavalue") or {}
    value = datavalue.get("value")
    return value if isinstance(value, str) else None


def _pick_wiki_title(entity: Dict[str, Any], lang: str) -> Optional[str]:
    sitelinks = entity.get("sitelinks") or {}
    key = f"{lang}wiki"
    if key in sitelinks:
        title = sitelinks[key].get("title")
        return title if isinstance(title, str) and title.strip() else None
    if "enwiki" in sitelinks:
        title = sitelinks["enwiki"].get("title")
        return title if isinstance(title, str) and title.strip() else None
    return None


def _choose_best_search_hit(hits: Any) -> Optional[str]:
    if not isinstance(hits, list):
        return None
    for hit in hits:
        if not isinstance(hit, dict):
            continue
        desc = (hit.get("description") or "").lower()
        if "chess" in desc or "ajedrez" in desc:
            qid = hit.get("id")
            return qid if isinstance(qid, str) else None
    if hits:
        qid = hits[0].get("id")
        return qid if isinstance(qid, str) else None
    return None


async def wikidata_search_qid(term: str, lang: str = "es") -> Optional[str]:
    params = {
        "action": "wbsearchentities",
        "search": term,
        "language": lang,
        "format": "json",
    }
    headers = {"User-Agent": _user_agent()}
    async with httpx.AsyncClient(headers=headers) as client:
        res = await client.get(WIKIDATA_ACTION_API, params=params, timeout=8.0)
        if res.status_code != 200:
            return None
        data = res.json()
        return _choose_best_search_hit(data.get("search"))


async def wikidata_get_entity(qid: str, lang: str = "es") -> Optional[Dict[str, Any]]:
    params = {
        "action": "wbgetentities",
        "ids": qid,
        "props": "labels|descriptions|claims|sitelinks|aliases",
        "languages": f"{lang}|en",
        "format": "json",
    }
    headers = {"User-Agent": _user_agent()}
    async with httpx.AsyncClient(headers=headers) as client:
        res = await client.get(WIKIDATA_ACTION_API, params=params, timeout=10.0)
        if res.status_code != 200:
            return None
        data = res.json()
        entities = data.get("entities") or {}
        entity = entities.get(qid)
        return entity if isinstance(entity, dict) else None


async def wikipedia_extract(title: str, lang: str = "es") -> Optional[str]:
    api = f"https://{lang}.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "prop": "extracts",
        "exintro": "1",
        "explaintext": "1",
        "titles": title,
        "format": "json",
        "redirects": "1",
    }
    headers = {"User-Agent": _user_agent()}
    async with httpx.AsyncClient(headers=headers) as client:
        res = await client.get(api, params=params, timeout=10.0)
        if res.status_code != 200:
            return None
        data = res.json()
        pages = _safe_get(data, "query", "pages", default={})
        if not isinstance(pages, dict) or not pages:
            return None
        page = next(iter(pages.values()))
        extract = page.get("extract")
        return extract.strip() if isinstance(extract, str) and extract.strip() else None


async def wdqs_world_champion_terms(qid: str) -> Optional[Dict[str, Any]]:
    query = f"""
SELECT ?start ?end WHERE {{
  wd:{qid} p:P39 ?statement .
  ?statement ps:P39 wd:Q10873124 .
  OPTIONAL {{ ?statement pq:P580 ?start . }}
  OPTIONAL {{ ?statement pq:P582 ?end . }}
}}
ORDER BY ?start
"""
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": _user_agent(),
    }
    async with httpx.AsyncClient(headers=headers) as client:
        res = await client.get(WDQS_ENDPOINT, params={"query": query}, timeout=12.0)
        if res.status_code != 200:
            return None
        data = res.json()
        bindings = _safe_get(data, "results", "bindings", default=[])
        if not isinstance(bindings, list):
            return None
        terms = []
        for row in bindings:
            start = _safe_get(row, "start", "value")
            end = _safe_get(row, "end", "value")
            terms.append({"start": start, "end": end})
        return {"world_champion_terms": terms}


def _is_cache_fresh(row: WikiEntityCache) -> bool:
    if not row or not row.fetched_at:
        return False
    age = _now_utc() - row.fetched_at
    return age.total_seconds() < (_cache_ttl_hours() * 3600)


async def get_or_fetch_wiki_profile(
    db: Session,
    coach_id: str,
    lang: str = "es",
) -> Optional[Dict[str, Any]]:
    term_map = {
        "fischer": "Bobby Fischer",
        "tal": "Mikhail Tal",
        "capablanca": "Jose Raul Capablanca",
        "kasparov": "Garry Kasparov",
        "carlsen": "Magnus Carlsen",
    }
    search_term = term_map.get(coach_id)
    if not search_term:
        return None

    cached = db.query(WikiEntityCache).filter(
        WikiEntityCache.coach_id == coach_id,
        WikiEntityCache.lang == lang,
    ).first()
    if cached and _is_cache_fresh(cached):
        return cached.as_dict()

    qid = await wikidata_search_qid(search_term, lang=lang)
    if not qid:
        return cached.as_dict() if cached else None

    entity = await wikidata_get_entity(qid, lang=lang)
    if not entity:
        return cached.as_dict() if cached else None

    label = _safe_get(entity, "labels", lang, "value", default=_safe_get(entity, "labels", "en", "value", default=""))
    description = _safe_get(entity, "descriptions", lang, "value", default=_safe_get(entity, "descriptions", "en", "value", default=""))
    wiki_title = _pick_wiki_title(entity, lang=lang)
    summary = await wikipedia_extract(wiki_title, lang=lang) if wiki_title else None

    birth = _extract_time_claim(entity, "P569")
    death = _extract_time_claim(entity, "P570")
    image = _extract_commons_image(entity)

    extra = await wdqs_world_champion_terms(qid)

    payload = {
        "coach_id": coach_id,
        "lang": lang,
        "qid": qid,
        "label": label,
        "description": description,
        "wikipedia_title": wiki_title,
        "wikipedia_summary": summary,
        "birth_date": birth,
        "death_date": death,
        "image": image,
        "wikidata_json": entity,
        "extra_json": extra or {},
        "fetched_at": _now_utc().isoformat(),
    }

    if not cached:
        cached = WikiEntityCache(coach_id=coach_id, lang=lang)
        db.add(cached)

    cached.qid = qid
    cached.label = label
    cached.description = description
    cached.wikipedia_title = wiki_title
    cached.wikipedia_summary = summary
    cached.birth_date = birth
    cached.death_date = death
    cached.image = image
    cached.wikidata_json = json.dumps(entity, ensure_ascii=False)
    cached.extra_json = json.dumps(extra or {}, ensure_ascii=False)
    cached.fetched_at = _now_utc()
    db.commit()

    return cached.as_dict()


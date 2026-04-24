"""
认知雷达 (Cognitive Radar) v3
HN 为主数据源，GitHub API 降级处理，优雅降级到缓存。
"""

import os, sys, json, time, logging, re, ssl
import urllib.request, urllib.error
from datetime import datetime, date
from pathlib import Path
from typing import Optional

VAULT_ROOT = Path(r"C:\Obsidian_Vault")
OUTPUT_FILE = VAULT_ROOT / "认知雷达.md"
CACHE_FILE = VAULT_ROOT / "logs" / "radar-cache.json"
LOG_DIR = VAULT_ROOT / "logs"
LOG_FILE = LOG_DIR / f"radar-{datetime.now().strftime('%Y%m%d')}.log"
MAX_RETRIES = 1
TIMEOUT_HTTP = 4

LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=str(LOG_FILE), level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    encoding="utf-8", force=True
)
log = logging.getLogger("radar")


def make_opener() -> urllib.request.OpenerDirector:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))


def fetch(url: str) -> Optional[str]:
    for attempt in range(MAX_RETRIES):
        try:
            opener = make_opener()
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Xiao7-Radar/1.0",
                "Accept": "application/json, text/html",
            })
            with opener.open(req, timeout=TIMEOUT_HTTP) as resp:
                enc = resp.headers.get_content_charset() or "utf-8"
                return resp.read().decode(enc, errors="replace")
        except Exception as e:
            log.warning(f"fetch attempt {attempt+1} failed for {url}: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
    log.error(f"all retries exhausted: {url}")
    return None


def fetch_hn_top3() -> list[dict]:
    """HN Top Stories，AI/科技相关优先"""
    data = fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
    if not data:
        return []
    try:
        ids: list[int] = json.loads(data)[:40]
        results: list[dict] = []
        ai_keywords = [
            "AI", "machine learning", "LLM", "model", "code", "data",
            "Python", "open source", "neural", "agent", "deep learning",
            "language model", "inference", "training", "benchmark",
            "algorithm", "research", "paper"
        ]
        for sid in ids:
            if len(results) >= 3:
                break
            item_data = fetch(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
            if not item_data:
                continue
            item = json.loads(item_data)
            title = item.get("title", "")
            url = item.get("url", f"https://news.ycombinator.com/item?id={sid}")
            score = item.get("score", 0)
            is_ai = any(k.lower() in title.lower() for k in ai_keywords)
            if not is_ai and score < 120:
                continue
            results.append({
                "title": title.strip(),
                "url": url,
                "score": score,
                "source": "HN",
                "is_ai": is_ai
            })
        log.info(f"HN: {len(results)} articles")
        return results[:3]
    except Exception as e:
        log.error(f"HN parse error: {e}")
        return []


def fetch_github_trending() -> list[dict]:
    """GitHub AI Trending via gh CLI (gh api) + 降级"""
    import subprocess

    # gh CLI 方式
    try:
        result = subprocess.run(
            ["gh", "api", "search/repositories",
             "--header", "Time-Zone: Asia/Shanghai",
             "-f", "q=AI OR LLM OR machine-learning in:name,description",
             "-f", "sort=stars", "-f", "order=desc", "-f", "per_page=3",
             "--json", "name,description,url,stargazerCount,languages"],
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=12
        )
        if result.returncode == 0:
            repos = json.loads(result.stdout)
            if repos:
                log.info(f"GitHub (gh): {len(repos)} repos")
                return [{"name": r["name"],
                         "description": r.get("description", ""),
                         "url": r.get("url", ""),
                         "stargazer_count": r.get("stargazerCount", 0),
                         "language": r.get("languages", [None])[0] if r.get("languages") else ""}
                        for r in repos[:3]]
    except Exception as e:
        log.warning(f"gh CLI failed: {e}")

    # gh 无法访问，降级到缓存
    cache = {}
    if CACHE_FILE.exists():
        try:
            cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    gh_cache = cache.get("github", {}).get("data", [])
    if gh_cache:
        log.info("GitHub: using cached data")
        return gh_cache[:3]

    log.warning("GitHub: no data available")
    return []


def save_cache(github_data: list, hn_data: list) -> None:
    cache = {}
    if CACHE_FILE.exists():
        try:
            cache = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    cache["github"] = {"data": github_data, "timestamp": datetime.now().isoformat()}
    cache["hn"] = {"data": hn_data, "timestamp": datetime.now().isoformat()}
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def condense_hn(item: dict) -> str:
    title = item["title"]
    score = item["score"]
    url = item["url"]
    ai_tag = " [AI]" if item.get("is_ai") else ""
    return f"- **{title}{ai_tag}**\n  HackerNews · {score} pts · {url}"


def condense_github(repo: dict) -> str:
    name = repo.get("name", "").replace("-", " ").replace("_", " ").title()
    desc_raw = repo.get("description") or "开源项目"
    desc = re.sub(r"\(.*?\)", "", desc_raw).strip()
    desc = re.sub(r"\s+", " ", desc)
    lang = repo.get("language") or ""
    stars = repo.get("stargazer_count", 0)
    url = repo.get("url", "")
    lines = [f"- **{name}** — {desc}"]
    if lang:
        lines.append(f"  {lang} · ★{stars:,} · {url}")
    return "\n".join(lines)


def append_radar(entries: list[str]) -> None:
    today = datetime.now().strftime("%Y-%m-%d")
    new_block = f"\n## {today}\n\n" + "\n\n".join(entries) + "\n"

    if OUTPUT_FILE.exists():
        content = OUTPUT_FILE.read_text(encoding="utf-8", errors="replace")
        if f"## {today}" in content:
            content = content.split(f"## {today}")[0]
        content = new_block + content
    else:
        content = (
            "# 认知雷达\n\n"
            "> 每日 AI/科技前沿情报精选。极简、无废话、直击本质。\n\n---\n"
            + new_block
        )

    OUTPUT_FILE.write_text(content, encoding="utf-8", errors="replace")
    log.info(f"Written {len(entries)} entries")


def main() -> None:
    log.info("=== 认知雷达启动 ===")
    hn_data = fetch_hn_top3()
    github_data = fetch_github_trending()

    save_cache(github_data, hn_data)

    entries: list[str] = []

    if hn_data:
        entries.extend(condense_hn(item) for item in hn_data[:3])

    if github_data:
        entries.extend(condense_github(repo) for repo in github_data[:3])
    else:
        entries.append("> GitHub trending 当前无法访问（SSL 网络限制），数据来自本地缓存")

    if entries:
        append_radar(entries)
    else:
        log.error("No data collected")

    log.info("=== 认知雷达完成 ===")


if __name__ == "__main__":
    main()

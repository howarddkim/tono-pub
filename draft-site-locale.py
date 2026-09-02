#!/usr/bin/env python3
"""Draft one language for index.html's I18N + SHOT_ALT dictionaries with Gemini.

    python3 draft-site-locale.py <code> "<Language name>"     e.g. pt-BR "Brazilian Portuguese"

Reads the English entries out of index.html, translates them in batches
(HTML tags, &amp; entities and the word Tono kept verbatim), and inserts a
"<code>": {...} block after the last existing language in each dictionary.
Machine-authored, like the rest of the site's twelve — a native pass is
still worth doing. Idempotent: refuses to run if the block already exists.
"""
import json, pathlib, re, subprocess, sys, time, urllib.request

code, name = sys.argv[1], sys.argv[2]
html_path = pathlib.Path(__file__).parent / "index.html"
html = html_path.read_text(encoding="utf-8")
if re.search(rf'^  "?{re.escape(code)}"?: \{{', html, re.M):
    sys.exit(f"{code} already present in I18N")

env = {}
for line in (pathlib.Path.home() / "nuance" / ".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
KEY = env["GEMINI_API_KEY"]; MODEL = "gemini-3.7-flash"

def block(var):
    i = html.index(f"var {var} = {{"); j = html.index("\n  };", i) + 4
    return html[i:j]
js = block("I18N") + "\n" + block("SHOT_ALT") + "\nconsole.log(JSON.stringify({i18n: I18N.en, alt: SHOT_ALT.en}));"
en = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)

def ask(items):
    prompt = (f"You are localizing the marketing website of 'Tono', an iOS translator app that explains "
              f"politeness levels (register). Translate each string from English into {name}. Rules: natural, "
              f"idiomatic marketing copy a native speaker would publish, matching the original's warmth and "
              f"brevity; keep HTML tags like <br> and entities like &amp; exactly; keep 'Tono', 'Tono Pro', "
              f"'App Store' and any Korean/Japanese example text untranslated; keep line lengths similar so "
              f"headlines still fit. Return a JSON array of strings, same order, one per input, nothing else.\n\n"
              + json.dumps(items, ensure_ascii=False))
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json",
                                 "responseSchema": {"type": "ARRAY", "items": {"type": "STRING"}},
                                 "thinkingConfig": {"thinkingLevel": "low"}, "temperature": 0.2, "maxOutputTokens": 8192}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                arr = json.loads(json.load(r)["candidates"][0]["content"]["parts"][0]["text"])
                if len(arr) == len(items): return arr
        except Exception as e:
            print("  retry:", str(e)[:100]); time.sleep(2 * (attempt + 1))
    raise SystemExit("drafting failed")

def draft(d):
    keys = list(d); out = {}
    for i in range(0, len(keys), 30):
        chunk = keys[i:i + 30]
        for k, v in zip(chunk, ask([d[k] for k in chunk])):
            for tag in ("<br>", "&amp;"):
                if tag in d[k] and tag not in v: raise SystemExit(f"{tag} lost in {k}: {v!r}")
            out[k] = v
        print(f"  {min(i + 30, len(keys))}/{len(keys)}")
    return out

print(f"I18N: {len(en['i18n'])} keys"); i18n = draft(en["i18n"])
print(f"SHOT_ALT: {len(en['alt'])} keys"); alt = draft(en["alt"])

def jsstr(s): return json.dumps(s, ensure_ascii=False)
i18n_block = f'  "{code}": {{\n' + "".join(f"    {k}: {jsstr(v)},\n" for k, v in i18n.items()) + "  },\n"
alt_line = f'    "{code}": {{' + ", ".join(f"{k}:{jsstr(v)}" for k, v in alt.items()) + "},\n"

# insert after the last language block of I18N (the one before "  };")
# I18N ends "  }\n  /*MORE_LANGS*/\n  };" — insert before the marker, and give
# the previous block the comma it lacks.
old = "  }\n  /*MORE_LANGS*/\n  };"
assert html.count(old) == 1, "I18N tail changed shape"
html = html.replace(old, "  },\n" + i18n_block + "  /*MORE_LANGS*/\n  };")
i = html.index("var SHOT_ALT = {"); j = html.index("\n  };", i)
assert html[j - 1] == "}", "unexpected SHOT_ALT tail"
html = html[:j] + "," + "\n" + alt_line + html[j + 1:]
html_path.write_text(html, encoding="utf-8")
print(f"inserted {code}: {len(i18n)} I18N keys, {len(alt)} alt strings")

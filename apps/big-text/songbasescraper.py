import json, urllib.request

req = urllib.request.Request(
    "https://songbase.life/api/v2/app_data",
    headers={"User-Agent": "Mozilla/5.0"},
)
with urllib.request.urlopen(req, timeout=300) as r:
    data = json.load(r)

with open("songbase_all.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

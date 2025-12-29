import json, os, glob, hashlib

manifest_path = os.path.join("design", "manifest.json")

files = sorted([p for p in glob.glob("design/**", recursive=True) if os.path.isfile(p)])
hashes = {}
for p in files:
    with open(p, "rb") as f:
        hashes[p.replace("\\","/")] = hashlib.sha256(f.read()).hexdigest()

# IMPORTANT: read/write with utf-8-sig to handle BOM on Windows
with open(manifest_path, "r", encoding="utf-8-sig") as f:
    m = json.load(f)

m.setdefault("hashes", {})
m["hashes"]["algo"] = "sha256"
m["hashes"]["files"] = hashes

with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, indent=2)

print("OK: manifest updated")

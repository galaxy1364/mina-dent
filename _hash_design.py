import hashlib, glob, json, os

files = sorted([p for p in glob.glob("design/**", recursive=True) if os.path.isfile(p)])
out = {}
for p in files:
    with open(p, "rb") as f:
        out[p.replace("\\","/")] = hashlib.sha256(f.read()).hexdigest()

print(json.dumps(out, ensure_ascii=False, indent=2))

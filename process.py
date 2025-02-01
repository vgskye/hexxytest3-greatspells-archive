import json
with open("registry_dump.json") as f:
    all_patterns = json.load(f)

with open("src/components/registry_dump.json", "w") as f:
    json.dump([pat for pat in all_patterns if ("isGreat" in pat and pat["isGreat"])], f)
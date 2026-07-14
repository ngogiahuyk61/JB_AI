import json

with open('f:/JB_AI/chiadongtu.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# We will collect verbs into a dictionary keyed by some base form (e.g., dictionary form in romaji or hiragana, or just combine them sequentially).
# Since Table 1 and Table 2 are sequential, maybe we can just read them.
# Let's inspect the data list sequentially.

clean_verbs = []

current_group = None
verbs_part1 = [] # stores dict with masu, te, dictionary
verbs_part2 = [] # stores dict with nai, ta, meaning, lesson

for row in data:
    keys = list(row.keys())
    col0 = str(row.get(keys[0], '')).strip()
    col1 = str(row.get('Unnamed: 1', '')).strip()
    col2 = str(row.get('Unnamed: 2', '')).strip()
    col3 = str(row.get('Unnamed: 3', '')).strip()

    if not col0 or col0 == 'None':
        continue

    # Detect Group
    if "Nhóm II" in col0 or "Nhóm 2" in col0:
        current_group = "II"
        continue
    elif "Nhóm I" in col0 or "Nhóm 1" in col0:
        current_group = "I"
        continue
    elif "Nhóm III" in col0 or "Nhóm 3" in col0:
        current_group = "III"
        continue

    # Detect headers
    if "thể ます" in col1 and "thể て" in col2:
        continue
    if "thể た" in col1 and "nghĩa" in col2:
        continue

    # If it's a part 1 row (has te and dictionary forms)
    if (col1.endswith('ます') or col2.endswith('て') or col2.endswith('で')) and not col2.startswith('nghĩa'):
        verbs_part1.append({
            'word': col0,
            'masu': col1,
            'te': col2,
            'dictionary': col3,
            'group': current_group or 'I' # default to I
        })
    # If it's a part 2 row (has nai, ta, meaning, lesson)
    elif col0.endswith('ない') or col1.endswith('た') or col1.endswith('だ'):
        verbs_part2.append({
            'nai': col0,
            'ta': col1,
            'meaning': col2,
            'lesson': col3
        })

# Now merge them. Assuming they are in the exact same order!
merged_verbs = []
min_len = min(len(verbs_part1), len(verbs_part2))
for i in range(min_len):
    v1 = verbs_part1[i]
    v2 = verbs_part2[i]
    merged_verbs.append({
        'meaning': v2['meaning'],
        'dictionary': v1['dictionary'],
        'masu': v1['masu'],
        'te': v1['te'],
        'ta': v2['ta'],
        'nai': v2['nai'],
        'group': v1['group'],
        'lesson': v2['lesson'],
        'word': v1['word']
    })

with open('f:/JB_AI/verbs_clean.json', 'w', encoding='utf-8') as f:
    json.dump(merged_verbs, f, ensure_ascii=False, indent=2)

print(f"Cleaned {len(merged_verbs)} verbs. (part1: {len(verbs_part1)}, part2: {len(verbs_part2)})")

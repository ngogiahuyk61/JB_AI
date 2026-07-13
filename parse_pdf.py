import sys, io, re, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from PyPDF2 import PdfReader

reader = PdfReader(r'f:\JB_AI\500-cau-hoi-kaiwa-minna-n5.pdf')

all_text = ''
for page in reader.pages:
    text = page.extract_text()
    if text:
        all_text += text + '\n'

lines = [l.strip() for l in all_text.split('\n') if l.strip()]
lines = [l for l in lines if not l.startswith('VINAJ')]

reconstructed = []
current = ''
for line in lines:
    is_new_question = bool(re.match(r'^\d+[\.．]', line))
    is_lesson = bool(re.match(r'^第[\d０-９]+課', line)) or line == '自己紹介'
    if is_new_question or is_lesson:
        if current:
            reconstructed.append(current)
        current = line
    else:
        current += line
if current:
    reconstructed.append(current)

result = {'sections': []}
current_lesson = None

for item in reconstructed:
    item = item.strip()
    if not item:
        continue
    
    is_lesson_header = re.match(r'^第[\d０-９]+課', item) or item == '自己紹介' or ('まとめ' in item and '第' in item)
    if is_lesson_header:
        lesson_name = item
        current_lesson = {'lesson': lesson_name, 'questions': []}
        result['sections'].append(current_lesson)
    elif re.match(r'^\d+[\.．]', item) and current_lesson:
        m = re.match(r'^(\d+)[\.．]\s*(.*)', item, re.DOTALL)
        if m:
            qnum = int(m.group(1))
            qtext = m.group(2).strip()
            qtext = re.sub(r'\s+', ' ', qtext)
            current_lesson['questions'].append({
                'no': qnum,
                'question': qtext
            })

sections = result['sections']
print('Total sections:', len(sections))
total_q = 0
for s in sections:
    count = len(s['questions'])
    total_q += count
    print('  ', s['lesson'], ':', count, 'questions')

print('Total questions:', total_q)

with open(r'f:\JB_AI\kaiwa_questions.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print('Saved kaiwa_questions.json')

# Print sample
print('\n=== SAMPLE: 第1課 ===')
for s in sections:
    if '第1課' in s['lesson'] or '第１課' in s['lesson']:
        for q in s['questions'][:5]:
            print(q['no'], '.', q['question'])
        break

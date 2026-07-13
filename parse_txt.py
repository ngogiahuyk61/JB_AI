import re
import json

def parse_kaiwa_txt(filepath):
    with open(filepath, encoding='utf-8') as f:
        lines = f.readlines()

    result = []
    current_lesson = None
    order_index = 0

    # Pattern nhận diện header bài học
    lesson_patterns = [
        r'^自己紹介',
        r'^第\d+[～~]?\d*課',
        r'^会話まとめ',
        r'^第\d+課まとめ',
    ]

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # Bỏ qua dòng tiêu đề file
        if '500 Câu Hỏi Kaiwa' in line and 'Trả Lời' in line:
            continue

        # Phát hiện header bài học
        is_lesson_header = any(re.match(p, line) for p in lesson_patterns)

        if is_lesson_header:
            order_index = 0
            # Tách tên bài học và tên tiếng Việt
            m = re.match(r'^(.+?)\s*[\(（](.+?)[\)）]', line)
            if m:
                lesson_jp = m.group(1).strip()
                lesson_vi = m.group(2).strip()
            else:
                lesson_jp = line.strip()
                lesson_vi = ''

            current_lesson = {
                'lessonTitle': lesson_jp,
                'lessonTitleVi': lesson_vi,
                'questions': []
            }
            result.append(current_lesson)
            continue

        # Phát hiện câu hỏi: bắt đầu bằng số
        if current_lesson is None:
            continue

        q_match = re.match(r'^(\d+)[\.:\s]\s*(.+)', line)
        if not q_match:
            continue

        no = int(q_match.group(1))
        content = q_match.group(2).strip()

        # Tách câu hỏi và câu trả lời
        # Chiến lược: tìm điểm tách sau "。" hoặc "か" cuối câu hỏi
        # Format: "[Câu hỏi]。 [Câu trả lời]" hoặc "[Câu hỏi]　[Câu trả lời]"
        
        question = ''
        answer = ''

        # Thử tách bằng "。 " (chấm + khoảng trắng)
        split_pos = -1
        
        # Tìm dấu "。" đầu tiên (kết thúc câu hỏi)
        for i, ch in enumerate(content):
            if ch == '。':
                # Kiểm tra nếu sau đó có khoảng trắng và nội dung
                rest = content[i+1:].lstrip()
                if rest and i < len(content) - 2:
                    split_pos = i + 1
                    break
            elif ch in ['？', '?'] and i < len(content) - 2:
                rest = content[i+1:].lstrip()
                if rest:
                    split_pos = i + 1
                    break

        if split_pos > 0:
            question = content[:split_pos].strip()
            answer = content[split_pos:].strip()
        else:
            # Thử tách bằng double space
            parts = re.split(r'\s{2,}', content, 1)
            if len(parts) == 2:
                question = parts[0].strip()
                answer = parts[1].strip()
            else:
                question = content.strip()
                answer = ''

        order_index += 1
        current_lesson['questions'].append({
            'no': no,
            'orderIndex': order_index,
            'question': question,
            'answer': answer
        })

    return result


def main():
    filepath = r'f:\JB_AI\500 Câu Hỏi Kaiwa Minna N5.txt'
    data = parse_kaiwa_txt(filepath)

    # In thống kê
    total_q = 0
    print(f"{'Bài học':<35} {'Số câu':>7}")
    print('-' * 45)
    for lesson in data:
        count = len(lesson['questions'])
        total_q += count
        print(f"{lesson['lessonTitle']:<35} {count:>7}")
    print('-' * 45)
    print(f"{'TỔNG':} {total_q}")

    # In mẫu vài câu đầu
    print('\n=== MẪU: 自己紹介 ===')
    for lesson in data:
        if lesson['lessonTitle'] == '自己紹介':
            for q in lesson['questions'][:3]:
                print(f"  Q: {q['question']}")
                print(f"  A: {q['answer']}")
                print()
            break

    print('\n=== MẪU: 第1課 ===')
    for lesson in data:
        if lesson['lessonTitle'] == '第1課':
            for q in lesson['questions'][:3]:
                print(f"  Q: {q['question']}")
                print(f"  A: {q['answer']}")
                print()
            break

    # Lưu JSON
    out_path = r'f:\JB_AI\kaiwa_data.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'\nSaved to {out_path}')


if __name__ == '__main__':
    main()

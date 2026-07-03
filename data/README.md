# Dữ liệu Từ điển Chuẩn (KANJIDIC2, Tatoeba)

Thư mục này chứa file dữ liệu nguồn để Backend import vào SQL Server khi khởi động.

## Cấu trúc

```
data/
├── kanjidic2/
│   ├── sample_kanjidic2.xml   ← Mẫu nhỏ (đã có sẵn, dùng để test)
│   └── kanjidic2.xml          ← File đầy đủ (tải về thủ công)
└── tatoeba/
    └── examples.tsv           ← Câu ví dụ curated (đã có sẵn)
```

## KANJIDIC2 — 13,000+ chữ Kanji

1. Tải file đầy đủ từ: http://www.edrdg.org/kanjidic/kanjidic2.xml
2. Đặt vào `data/kanjidic2/kanjidic2.xml`
3. Khởi động lại Backend — `KanjiDic2Importer` sẽ tự import (batch 500, bỏ qua trùng)

## Tatoeba — Câu ví dụ

File `tatoeba/examples.tsv` dùng format:

```
vocab_key \t câu_tiếng_Nhật \t bản_dịch \t romaji
```

- `vocab_key` khớp với `Kanji` hoặc `Kana` trong bảng Vocabulary
- Chỉ cập nhật từ chưa có `ExampleSentence`
- Bản dịch hiện tại là **tiếng Việt** (có thể bổ sung thêm cột EN nếu cần)

## Import thủ công (tùy chọn)

Backend tự chạy import khi start qua `DbInitializer`. Không cần lệnh riêng.

## Ghi chú hiệu suất

- Import KANJIDIC2 đầy đủ (~30MB XML) mất khoảng 2–5 phút lần đầu
- Các lần start sau chỉ thêm kanji mới (không ghi đè)
- Frontend tra cứu qua API `/api/kanji/analyze?word=電車` hoặc `/api/vocabulary/{id}`

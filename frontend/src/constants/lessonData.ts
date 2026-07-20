export interface LessonDefinition {
  lessonNum: number;
  title: string;
  theme: string;
  sttRanges: [number, number][];
}

export const N5_LESSONS: LessonDefinition[] = [
  { lessonNum: 1, title: 'Bài 1', theme: 'Giới thiệu bản thân', sttRanges: [[1, 25], [60, 60]] },
  { lessonNum: 2, title: 'Bài 2', theme: 'Chỉ thị từ & Đồ vật', sttRanges: [[26, 51]] },
  { lessonNum: 3, title: 'Bài 3', theme: 'Địa điểm & Mua sắm', sttRanges: [[52, 74]] },
  { lessonNum: 4, title: 'Bài 4', theme: 'Thời gian & Động từ', sttRanges: [[75, 119]] },
  { lessonNum: 5, title: 'Bài 5', theme: 'Di chuyển', sttRanges: [[120, 158]] },
  { lessonNum: 6, title: 'Bài 6', theme: 'Hành động hàng ngày', sttRanges: [[159, 192]] },
  { lessonNum: 7, title: 'Bài 7', theme: 'Công cụ & Cho/Nhận', sttRanges: [[193, 230]] },
  { lessonNum: 8, title: 'Bài 8', theme: 'Tính từ & Thời tiết', sttRanges: [[231, 275]] },
  { lessonNum: 9, title: 'Bài 9', theme: 'Sở thích & Khả năng', sttRanges: [[276, 317]] },
  { lessonNum: 10, title: 'Bài 10', theme: 'Sự tồn tại & Vị trí', sttRanges: [[318, 360]] },
  { lessonNum: 11, title: 'Bài 11', theme: 'Số đếm & Lượng từ', sttRanges: [[361, 368]] },
  { lessonNum: 12, title: 'Bài 12', theme: 'So sánh & Tính từ quá khứ', sttRanges: [[369, 395]] },
  { lessonNum: 13, title: 'Bài 13', theme: 'Mong muốn & Mục đích', sttRanges: [[396, 428]] },
  { lessonNum: 14, title: 'Bài 14', theme: 'Chia Thể Te (Nhóm 1)', sttRanges: [[429, 461]] },
  { lessonNum: 15, title: 'Bài 15', theme: 'Chia Thể Te (Nhóm 2)', sttRanges: [[462, 486]] },
  { lessonNum: 16, title: 'Bài 16', theme: 'Chuỗi hành động', sttRanges: [[487, 524]] },
  { lessonNum: 17, title: 'Bài 17', theme: 'Thể Nai (Khuyên bảo/Cấm)', sttRanges: [[525, 558]] },
  { lessonNum: 18, title: 'Bài 18', theme: 'Thể Jisho (Khả năng)', sttRanges: [[559, 586]] },
  { lessonNum: 19, title: 'Bài 19', theme: 'Thể Ta (Kinh nghiệm)', sttRanges: [[587, 608]] },
  { lessonNum: 20, title: 'Bài 20', theme: 'Thể thông thường', sttRanges: [[609, 622]] },
  { lessonNum: 21, title: 'Bài 21', theme: 'Trích dẫn & Ý kiến', sttRanges: [[623, 658]] },
  { lessonNum: 22, title: 'Bài 22', theme: 'Mệnh đề bổ nghĩa', sttRanges: [[659, 670]] },
  { lessonNum: 23, title: 'Bài 23', theme: 'Mệnh đề Thời điểm/Điều kiện', sttRanges: [[671, 695]] },
  { lessonNum: 24, title: 'Bài 24', theme: 'Cho/Nhận nâng cao', sttRanges: [[696, 712]] },
  { lessonNum: 25, title: 'Bài 25', theme: 'Điều kiện giả định', sttRanges: [[713, 730]] },
];

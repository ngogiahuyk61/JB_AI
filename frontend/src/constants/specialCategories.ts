export type SpecialCategory = 'n2_bs' | 'tu_lay' | 'luong_tu';

export const SPECIAL_CATEGORIES: {
  id: SpecialCategory;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  { id: 'n2_bs', label: 'N2-BS', shortLabel: 'N2-BS', color: '#9a3412', bg: '#fff7ed', border: '#fdba74' },
  { id: 'tu_lay', label: 'Từ láy', shortLabel: 'Từ láy', color: '#6b21a8', bg: '#faf5ff', border: '#c4b5fd' },
  { id: 'luong_tu', label: 'Lượng từ', shortLabel: 'Lượng từ', color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
];

export function getSpecialCategoryLabel(id: SpecialCategory): string {
  return SPECIAL_CATEGORIES.find(c => c.id === id)?.label ?? id;
}

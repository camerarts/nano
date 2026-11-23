import React, { useEffect, useState } from 'react';

// 全铺模式：列数随窗口宽度增加，窗口越宽显示的卡片越多
// <1024: 2 列；>=1024: 3 列；>=1440: 4 列；>=1800: 5 列；>=2200: 6 列
const BREAKPOINTS: [number, number][] = [
  [2200, 6],
  [1800, 5],
  [1440, 4],
  [1024, 3],
];

const getColumnCount = () => {
  if (typeof window === 'undefined') return 2;
  const w = window.innerWidth;
  for (const [min, cols] of BREAKPOINTS) if (w >= min) return cols;
  return 2;
};

interface MasonryColumnsProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

/**
 * 瀑布流布局：每列独立纵向堆叠，卡片紧贴上一张，不留空隙。
 * 条目按顺序轮流分配到各列，保持从左到右的阅读顺序。
 */
function MasonryColumns<T>({ items, renderItem }: MasonryColumnsProps<T>) {
  const [cols, setCols] = useState(getColumnCount);

  useEffect(() => {
    const onResize = () => setCols(getColumnCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const columns: T[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push(item));

  return (
    <div className="flex items-start gap-2 md:gap-6">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-2 md:gap-6">
          {col.map((item) => renderItem(item))}
        </div>
      ))}
    </div>
  );
}

export default MasonryColumns;

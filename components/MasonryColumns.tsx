import React, { useEffect, useState } from 'react';

// 与原网格一致：默认 2 列，lg(>=1024px) 3 列
const getColumnCount = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? 3 : 2;

interface MasonryColumnsProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

/**
 * 瀑布流布局：每列独立纵向堆叠，卡片紧贴上一张，不再受同一行最高卡片影响。
 * 条目按顺序轮流分配到各列（第1张→第1列，第2张→第2列…），保持从左到右的阅读顺序。
 */
function MasonryColumns<T>({ items, renderItem }: MasonryColumnsProps<T>) {
  const [cols, setCols] = useState(getColumnCount);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setCols(getColumnCount());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const columns: T[][] = Array.from({ length: cols }, () => []);
  items.forEach((item, i) => columns[i % cols].push(item));

  return (
    <div className="flex items-start gap-2 md:gap-8">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0 flex flex-col gap-2 md:gap-8">
          {col.map((item) => renderItem(item))}
        </div>
      ))}
    </div>
  );
}

export default MasonryColumns;

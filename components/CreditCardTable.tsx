
import React from 'react';
import { CreditCard } from '../types.ts';
import { Trash2, Calendar, Clock } from 'lucide-react';

interface CreditCardTableProps {
  cards: CreditCard[];
  onDelete: (id: string) => void;
}

export const CreditCardTable: React.FC<CreditCardTableProps> = ({ cards, onDelete }) => {
  const today = new Date().getDate();
  const getDaysUntil = (targetDay: number) => {
    if (targetDay >= today) return targetDay - today;
    return (30 - today) + targetDay;
  };

  return (
    <div className="relative">
      <div className="xs:hidden text-[9px] text-indigo-300 mb-2 italic">← 可向左滑動查看完整資訊 →</div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px] xs:min-w-0">
          <thead>
            <tr className="border-b border-white/10 text-indigo-200 text-[9px] sm:text-[10px] uppercase tracking-widest font-black">
              <th className="px-4 sm:px-6 py-4">卡片</th>
              <th className="px-4 sm:px-6 py-4">結帳日</th>
              <th className="px-4 sm:px-6 py-4">繳款日</th>
              <th className="px-4 sm:px-6 py-4">週期</th>
              <th className="px-4 sm:px-6 py-4 text-right">刪除</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {cards.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-indigo-300/50 italic text-xs">尚未建立資料</td></tr>
            ) : (
              cards.map((card) => {
                const daysToClosing = getDaysUntil(card.closingDay);
                const daysToPayment = getDaysUntil(card.paymentDay);
                return (
                  <tr key={card.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 rounded-full bg-indigo-500 shadow-lg"></div>
                        <span className="font-bold text-white text-xs">{card.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-[11px] font-mono text-indigo-100">每月 {card.closingDay} 日</td>
                    <td className="px-4 sm:px-6 py-4 text-[11px] font-mono font-bold text-rose-300">每月 {card.paymentDay} 日</td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="h-1 w-20 bg-white/10 rounded-full overflow-hidden flex">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.max(5, 100 - (daysToClosing * 3.3))}%` }}></div>
                        <div className="h-full bg-rose-500" style={{ width: `${Math.max(5, 100 - (daysToPayment * 3.3))}%` }}></div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button onClick={() => onDelete(card.id)} className="p-1.5 text-white/20 hover:text-rose-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

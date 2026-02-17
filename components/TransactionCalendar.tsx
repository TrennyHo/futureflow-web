import React, { useState, useMemo } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  eachDayOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
// ⭐ 修正：確保路徑與您 App.tsx 一致
import { Transaction, TransactionType } from '../types';

interface CalendarProps {
  transactions: Transaction[];
  onDateClick?: (date: string) => void;
}

export const TransactionCalendar: React.FC<CalendarProps> = ({ transactions, onDateClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ⭐ 優化：使用 useMemo 封裝計算邏輯，當 transactions 或月份改變時才重新計算
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth)),
      end: endOfWeek(endOfMonth(currentMonth)),
    });
  }, [currentMonth]);

  // 計算特定日期的收支統計
  const getDayStats = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTrans = transactions.filter(t => t.date === dateStr);

    // 這裡要對應您的 TransactionType 定義（可能是 'income'/'expense' 或 大寫）
    const income = dayTrans
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((s, t) => s + t.amount, 0);
    const expense = dayTrans
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((s, t) => s + t.amount, 0);

    return { income, expense };
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">
      {/* 總裁黑標頭部 */}
      <div className="bg-slate-900 p-6 flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-white text-xl font-black capitalize">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Empire Monthly Overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-800 rounded-xl text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 星期導航 */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
        ))}
      </div>

      {/* 日曆格子 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const { income, expense } = getDayStats(day);
          const isSelected = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={i}
              onClick={() => onDateClick?.(format(day, 'yyyy-MM-dd'))}
              className={`min-h-[110px] p-2 border-b border-r border-slate-50 cursor-pointer transition-all hover:bg-emerald-50/30 relative ${!isCurrentMonth ? 'bg-slate-50/50 opacity-25' : ''}`}
            >
              <span className={`text-[10px] font-black ${isSelected ? 'bg-emerald-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                {format(day, 'd')}
              </span>

              <div className="mt-2 space-y-1">
                {/* 🚀 收入：強制顯示正數並加上 "+" 號 */}
                {income > 0 && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-1 rounded-md">
                    <TrendingUp className="w-2.5 h-2.5" /> +${income.toLocaleString()}
                  </div>
                )}
                {/* 🚀 支出：顯示負數 */}
                {expense > 0 && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded-md">
                    <TrendingDown className="w-2.5 h-2.5" /> -${expense.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
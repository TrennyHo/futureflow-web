import React, { useMemo } from 'react';
import { Transaction, TransactionType, CategoryBudget } from '../types';
import { AlertCircle, CheckCircle2, Flame } from 'lucide-react';

interface BudgetMonitorProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
}

export const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ transactions, budgets = [] }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const budgetStats = useMemo(() => {
    // 1. 計算本月各類別已花費金額
    const monthlyExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(currentMonth))
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // 2. 對比預算額度
    return budgets.map(b => {
      const spent = monthlyExpenses[b.category] || 0;
      const percent = (spent / b.limit) * 100;
      return { ...b, spent, percent };
    }).filter(b => b.limit > 0); // 只顯示有設定預算的類別
  }, [transactions, budgets, currentMonth]);

  if (budgetStats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {budgetStats.map(stat => {
        const isOver = stat.percent >= 100;
        const isWarning = stat.percent >= 80;

        return (
          <div key={stat.category} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-800">{stat.category}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOver ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isOver ? '已爆表' : isWarning ? '警戒中' : '安全'}
              </span>
            </div>
            
            <div className="flex items-end justify-between mb-2">
              <p className="text-lg font-black text-slate-900">${stat.spent.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-bold">上限 ${stat.limit.toLocaleString()}</p>
            </div>

            {/* 進度條背景 */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(stat.percent, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
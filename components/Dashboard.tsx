import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, CreditCardDebt } from '../types.ts';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { History, ArrowUpRight, ArrowDownRight, PieChart as PieIcon, TrendingUp } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  cardDebts: CreditCardDebt[]; 
}

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions = [], cardDebts = [] }) => {
  const [historyMode, setHistoryMode] = useState<'combined' | 'income' | 'expense' | 'split'>('combined');

  // 1. 核心結算：包含分期債務
  const summary = useMemo(() => {
    const base = transactions.reduce((acc, curr) => {
      if (curr.type === TransactionType.INCOME) acc.income += Number(curr.amount || 0);
      else acc.expense += Number(curr.amount || 0);
      return acc;
    }, { income: 0, expense: 0 });

    const debtPaidTotal = cardDebts.reduce((sum, d) => sum + Number(d.monthlyAmount || 0), 0);

    return { 
      income: base.income, 
      expense: base.expense + debtPaidTotal,
      balance: base.income - (base.expense + debtPaidTotal)
    };
  }, [transactions, cardDebts]);
  
  // 2. 支出數據 (實心滿圓)
  const expensePieData = useMemo(() => {
    const categoryMap = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    const debtPaidTotal = cardDebts?.reduce((sum, d) => sum + Number(d.monthlyAmount || 0), 0) || 0;
    if (debtPaidTotal > 0) categoryMap['分期債務'] = (categoryMap['分期債務'] || 0) + debtPaidTotal;

    return Object.keys(categoryMap).map(name => ({ name, value: categoryMap[name] }));
  }, [transactions, cardDebts]);

  // 3. 收入數據 (⭐ 新增收入結構邏輯)
  const incomePieData = useMemo(() => {
    const categoryMap = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    return Object.keys(categoryMap).map(name => ({ name, value: categoryMap[name] }));
  }, [transactions]);

  // 4. 週趨勢數據 (24 週)
  const historyData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    const currentMonday = new Date(today);
    const day = currentMonday.getDay();
    currentMonday.setDate(currentMonday.getDate() - day + (day === 0 ? -6 : 1));

    for (let i = 24; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekTrans = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= weekStart && d <= weekEnd;
      });

      const income = weekTrans.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
      const expense = weekTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);

      weeks.push({ 
        name: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`, 
        income, expense 
      });
    }
    return weeks;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* 🟢 數據卡片 */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
        <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl text-white">
          <p className="text-[10px] text-slate-400 font-black mb-1">淨資產水位</p>
          <p className="text-2xl font-black">${summary.balance.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-emerald-600 font-black mb-1">累積收入</p>
          <p className="text-2xl font-black text-emerald-600">${summary.income.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-rose-500">
          <p className="text-[10px] text-rose-600 font-black mb-1">累積支出</p>
          <p className="text-2xl font-black text-rose-600">${summary.expense.toLocaleString()}</p>
        </div>
      </div>

      {/* 🔵 雙實心滿圓圖區 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 收入結構 (左) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
             <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><PieIcon className="w-4 h-4"/></div>
             收入結構
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={0} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {incomePieData.map((_, index) => (<Cell key={`inc-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 支出分佈 (右) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
             <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><PieIcon className="w-4 h-4"/></div>
             支出類別 
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={0} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {expensePieData.map((_, index) => (<Cell key={`exp-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🟣 24 週趨勢 */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2 bg-slate-900 rounded-xl text-white"><History className="w-5 h-5" /></div>
          <h3 className="text-base font-black text-slate-800">24 週資產流動趨勢</h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="cI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="cE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" interval={3} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
              <Area type="monotone" dataKey="income" name="週收入" stroke="#10b981" strokeWidth={4} fill="url(#cI)" />
              <Area type="monotone" dataKey="expense" name="週支出" stroke="#f43f5e" strokeWidth={4} fill="url(#cE)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { SavingsPlan, Transaction, TransactionType, Account, PaymentMethod } from '../types.ts';
import {
  Target, // ⭐ 確保這裡有 Target
  Mountain, Plus, Trash2, TrendingUp,
  Calendar, Info, Calculator, Star, ArrowUpRight, Trophy, Sparkles,
  ShieldCheck // 👈 額外建議加入，用於代表「保費/儲備」類目標
} from 'lucide-react';

interface SavingsPlannerProps {
  plans: SavingsPlan[];
  transactions: Transaction[];
  accounts: Account[];
  onAdd: (plan: Omit<SavingsPlan, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdatePlan: (id: string, newAmount: number) => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
}

export const SavingsPlanner: React.FC<SavingsPlannerProps> = ({
  plans, transactions, accounts, onAdd, onDelete, onUpdatePlan, onAddTransaction
}) => {
  const [showForm, setShowForm] = useState(false);
  const [allocatingPlanId, setAllocatingPlanId] = useState<string | null>(null);
  const [allocAmount, setAllocAmount] = useState('');
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || '');

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [percent, setPercent] = useState('10');

  const avgMonthlyIncome = useMemo(() => {
    const incomes = transactions.filter(t => t.type === TransactionType.INCOME);
    if (incomes.length === 0) return 0;
    const amounts = incomes.reduce((sum, t) => sum + t.amount, 0);
    return Math.round(amounts / Math.max(1, incomes.length / 2));
  }, [transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    onAdd({
      name,
      targetAmount: parseFloat(target),
      currentAmount: parseFloat(current) || 0,
      allocationPercentage: parseFloat(percent),
      startDate: new Date().toISOString().split('T')[0],
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
    setName(''); setTarget(''); setCurrent('0'); setShowForm(false);
  };

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === allocatingPlanId);
    const amount = parseFloat(allocAmount);
    if (!plan || isNaN(amount) || amount <= 0 || !selectedAccId) return;

    onAddTransaction({
      amount: amount,
      type: TransactionType.EXPENSE,
      category: '儲蓄提撥',
      note: `提撥：${plan.name}`,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: PaymentMethod.CASH,
      accountId: selectedAccId
    });

    onUpdatePlan(plan.id, plan.currentAmount + amount);
    setAllocAmount('');
    setAllocatingPlanId(null);
  };

  return (
    <div className="space-y-6">
      {/* 提撥彈窗 */}
      {allocatingPlanId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ArrowUpRight className="w-6 h-6 text-emerald-500" /> 手動提撥資金
            </h3>
            <form onSubmit={handleAllocate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">從哪個帳戶扣款？</label>
                <select
                  value={selectedAccId}
                  onChange={e => setSelectedAccId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none"
                >
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">提撥金額</label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    value={allocAmount}
                    onChange={e => setAllocAmount(e.target.value)}
                    placeholder="輸入金額..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-lg font-black outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">$</span>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setAllocatingPlanId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all">取消</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">確認撥款</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 頂部統計卡片 */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none -rotate-12"><Trophy className="w-24 h-24" /></div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-1 flex items-center gap-2">戰略目標 <Sparkles className="w-5 h-5 text-yellow-300" /></h3>
          <p className="text-xs text-indigo-100/70 font-bold mb-6">先撥款、後生活：精準掌控資產分配</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] uppercase font-black text-indigo-200 mb-1">預估月收入</p>
              <p className="text-xl font-black">${avgMonthlyIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <p className="text-[10px] uppercase font-black text-indigo-200 mb-1">基金計劃總數</p>
              <p className="text-xl font-black">{plans.length} 個</p>
            </div>
          </div>
        </div>
      </div>

      {/* 新增計劃表單 */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 group"
        >
          <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-indigo-100 transition-all">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-sm font-black tracking-widest">建立新的戰略目標</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-base font-black text-slate-800 flex items-center gap-2"><Mountain className="w-5 h-5 text-indigo-500" /> 設定理財目標</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-600"><Plus className="w-5 h-5 rotate-45" /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">基金名稱</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="如：日本旅遊基金、換房首付款" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">目標金額</label>
                <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none" required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">已提撥初始金</label>
                <input type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none" />
              </div>
            </div>

            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-indigo-700 uppercase">預計每月自動提撥比例</label>
                <span className="text-lg font-black text-indigo-600">{percent}%</span>
              </div>
              <input type="range" min="1" max="50" step="1" value={percent} onChange={e => setPercent(e.target.value)} className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <div className="mt-4 flex items-center gap-3 text-indigo-900/60">
                <Calculator className="w-4 h-4 shrink-0" />
                <p className="text-[10px] font-bold leading-relaxed">
                  基於平均收入，未來每月需額外提撥 <span className="text-indigo-700 font-black">${Math.round(avgMonthlyIncome * (parseFloat(percent) / 100)).toLocaleString()}</span> 以達成。
                </p>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full mt-6 bg-indigo-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
            確認建立並開始追蹤
          </button>
        </form>
      )}

      {/* 計劃列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map(plan => {
          // 🛡️ 總裁戰略：自動辨識「儲備型」目標（如保費、稅金）
          const isReserve = /保費|稅|緊急|保險|房貸/.test(plan.name);
          const themeColor = isReserve ? '#1e293b' : plan.color;

          const monthlyAlloc = Math.round(avgMonthlyIncome * (plan.allocationPercentage / 100));
          const remaining = plan.targetAmount - plan.currentAmount;
          const monthsToTarget = monthlyAlloc > 0 ? Math.ceil(remaining / monthlyAlloc) : Infinity;
          const progress = Math.min(100, Math.round((plan.currentAmount / plan.targetAmount) * 100));

          return (
            <div key={plan.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-all duration-700 -z-0"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500" style={{ backgroundColor: themeColor }}>
                      {isReserve ? <ShieldCheck className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-800">{plan.name}</h4>
                        {isReserve && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">必要儲備</span>}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目標：${plan.targetAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAllocatingPlanId(plan.id)}
                      className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      <span className="text-[10px] font-black">撥款</span>
                    </button>
                    <button onClick={() => onDelete(plan.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black text-slate-700">
                      ${plan.currentAmount.toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-bold ml-1">已到位</span>
                    </span>
                    <span className="text-xs font-black" style={{ color: themeColor }}>{progress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress}%`, backgroundColor: themeColor }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">月自動分配 {plan.allocationPercentage}%</p>
                      <p className="text-xs font-black text-slate-800">${monthlyAlloc.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">預計達成日期</p>
                      <p className="text-xs font-black text-indigo-600">
                        {monthsToTarget === Infinity ? '待分配收入' : monthsToTarget <= 0 ? '戰略目標已達成' :
                          new Date(new Date().setMonth(new Date().getMonth() + monthsToTarget)).toLocaleDateString('zh-TW', { year: 'numeric', month: 'short' })
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {plans.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300">
            <Trophy className="w-12 h-12 opacity-10 mb-4" />
            <p className="text-xs italic">開始建立您的第一個戰略目標吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, CreditCardDebt, CreditCard, PaymentMethod, RecurringExpense } from '../types.ts';
import { 
  Trash2, AlertCircle, CheckCircle2, CalendarClock, CreditCard as CardIcon, Target, Repeat, Wallet, TrendingUp, TrendingDown, Edit2, Check, X
} from 'lucide-react';

interface BudgetPlannerProps {
  transactions: Transaction[];
  cardDebts: CreditCardDebt[];
  creditCards: CreditCard[];
  recurringExpenses: RecurringExpense[];
  onDelete: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
  onUpdateRecurring: (updated: RecurringExpense) => void; // ⭐ 新增修改介面
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ 
  transactions, cardDebts, creditCards, recurringExpenses, onDelete, onDeleteRecurring, onUpdateRecurring 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RecurringExpense>>({});
  
  const todayStr = new Date().toISOString().split('T')[0];

  // 進入編輯模式
  const startEdit = (rec: RecurringExpense) => {
    setEditingId(rec.id);
    setEditForm({ ...rec });
  };

  // 儲存編輯結果
  const saveEdit = () => {
    if (editingId && editForm) {
      onUpdateRecurring(editForm as RecurringExpense);
      setEditingId(null);
    }
  };

  const futureTransactions = useMemo(() => {
    return transactions.filter(t => t.date > todayStr);
  }, [transactions, todayStr]);

  const monthActuals = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const trans = transactions.filter(t => t.date.startsWith(currentMonth) && t.date <= todayStr);
    const inc = trans.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const exp = trans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return { income: inc, expense: exp };
  }, [transactions, todayStr]);

  const unpaidCreditCardsTotal = useMemo(() => {
    return transactions.filter(t => t.paymentMethod === PaymentMethod.CREDIT_CARD && t.type === TransactionType.EXPENSE && t.date <= todayStr).reduce((s, t) => s + t.amount, 0);
  }, [transactions, todayStr]);

  const weeklyForecast = useMemo(() => {
    const today = new Date();
    const weeks = [];
    
    // ⭐ 建立快速查找表：信用卡 ID -> 詳細資訊
    const cardMap = creditCards.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<string, CreditCard>);

    for (let i = 0; i < 8; i++) {
      const start = new Date(today); start.setDate(today.getDate() + (i * 7));
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const weekItems: any[] = [];
      let weeklyIncome = 0;
      let weeklyExpense = 0;

      // --- 1. 處理單次交易 (未來預計) ---
      futureTransactions.forEach(it => {
        let targetDate = new Date(it.date);
        if (it.paymentMethod === PaymentMethod.CREDIT_CARD && it.type === TransactionType.EXPENSE && it.creditCardId) {
          const card = cardMap[it.creditCardId];
          if (card) {
            // 邏輯：刷卡日 > 結帳日 ? 下下月繳 : 下月繳
            if (targetDate.getDate() > card.closingDay) {
              targetDate.setMonth(targetDate.getMonth() + 2);
            } else {
              targetDate.setMonth(targetDate.getMonth() + 1);
            }
            targetDate.setDate(card.paymentDay);
          }
        }
        if (targetDate >= start && targetDate <= end) { 
          weekItems.push({ label: it.note || it.category, amount: it.amount, type: it.type === TransactionType.INCOME ? 'income' : 'planned' }); 
          if(it.type === TransactionType.INCOME) weeklyIncome += it.amount; else weeklyExpense += it.amount;
        }
      });

      // --- 2. 處理分期債務 ---
      cardDebts.forEach(dbt => {
        // 為了效能，這裡直接比對日期
        const tempDate = new Date(start);
        for (let j = 0; j < 7; j++) {
          if (tempDate.getDate() === dbt.paymentDay) { 
            weekItems.push({ label: `${dbt.cardName} (分期)`, amount: dbt.monthlyAmount, type: 'debt' }); 
            weeklyExpense += dbt.monthlyAmount; 
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
      });

      // --- 3. 處理固定收支 (月底自動校正) ---
      recurringExpenses.forEach(rec => {
        const tempDate = new Date(start);
        for (let j = 0; j < 7; j++) {
          const lastDay = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
          let displayDay = Math.min(rec.dayOfMonth, lastDay);
          
          if (rec.type === TransactionType.EXPENSE && rec.paymentMethod === PaymentMethod.CREDIT_CARD && rec.creditCardId) {
            const card = cardMap[rec.creditCardId];
            if (card) displayDay = card.paymentDay; 
          }

          if (tempDate.getDate() === displayDay) {
            if (rec.type === TransactionType.INCOME) {
              weekItems.push({ label: `${rec.description} (固定收入)`, amount: rec.amount, type: 'income' });
              weeklyIncome += rec.amount;
            } else {
              const labelType = rec.paymentMethod === PaymentMethod.CASH ? '固定支出' : '卡繳實支';
              weekItems.push({ label: `${rec.description} (${labelType})`, amount: rec.amount, type: rec.paymentMethod === PaymentMethod.CASH ? 'recurring' : 'credit_card' });
              weeklyExpense += rec.amount;
            }
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
      });

      // --- 4. 處理「本月已刷卡」總額 (精確帳期版) ---
      creditCards.forEach(c => {
        const amt = transactions.filter(t => 
          t.creditCardId === c.id && 
          t.paymentMethod === PaymentMethod.CREDIT_CARD && 
          t.date <= todayStr
        ).reduce((s, t) => s + t.amount, 0);

        if (amt > 0) {
          const billBatches: Record<string, number> = {};
          
          // 判定帳單所屬繳款日
          const txDate = new Date(todayStr);
          let pYear = txDate.getFullYear();
          let pMonth = txDate.getMonth();

          if (txDate.getDate() > c.closingDay) {
            pMonth += 2; 
          } else {
            pMonth += 1;
          }

          const payDate = new Date(pYear, pMonth, c.paymentDay);
          const payDateStr = payDate.toDateString();

          // 使用獨立比對，確保不汙染迴圈
          if (payDate >= start && payDate <= end) {
            weekItems.push({ 
              label: `${c.name} (${payDate.getMonth() + 1}月帳單)`, 
              amount: amt, 
              type: 'credit_card' 
            }); 
            weeklyExpense += amt;
          }
        }
      });

      weeks.push({ num: i + 1, range: `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`, items: weekItems, total: weeklyIncome - weeklyExpense, weeklyIncome, weeklyExpense });
    }
    return weeks;
  }, [futureTransactions, cardDebts, creditCards, transactions, recurringExpenses, todayStr]);


  const stats = useMemo(() => {
    const plannedInc = futureTransactions.filter(i => i.type === TransactionType.INCOME).reduce((s, i) => s + i.amount, 0);
    const plannedExp = futureTransactions.filter(i => i.type === TransactionType.EXPENSE).reduce((s, i) => s + i.amount, 0);
    const recurringInc = recurringExpenses.filter(r => r.type === TransactionType.INCOME).reduce((s, r) => s + r.amount, 0);
    const recurringExp = recurringExpenses.filter(r => r.type === TransactionType.EXPENSE).reduce((s, r) => s + r.amount, 0);
    const pendingDebt = cardDebts.filter(d => !d.isPaidThisMonth).reduce((s, d) => s + d.monthlyAmount, 0);
    const totalExp = monthActuals.expense + plannedExp + recurringExp + pendingDebt + unpaidCreditCardsTotal;
    const totalInc = monthActuals.income + plannedInc + recurringInc;
    return { totalInc, totalExp, remaining: totalInc - totalExp };
  }, [futureTransactions, monthActuals, cardDebts, unpaidCreditCardsTotal, recurringExpenses]);

  const isBalanced = stats.remaining >= 0;

  return (
    <div className="space-y-8">
      {/* 預算導航卡片 (保持不變) */}
      <div className={`p-8 rounded-[2.5rem] border transition-all shadow-xl ${isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className={`text-xl font-black ${isBalanced ? 'text-emerald-900' : 'text-rose-900'}`}>預算導航</h3>
            <p className="text-xs mt-1 text-slate-500">{isBalanced ? '目前資金足以支付未來預計支出。' : '警告：未來支出可能超過收入。'}</p>
          </div>
          <div className={`p-4 rounded-2xl ${isBalanced ? 'bg-emerald-200/40 text-emerald-700' : 'bg-rose-200/40 text-rose-700'}`}>
            {isBalanced ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white/70 p-4 rounded-2xl border border-white">
            <p className="text-[10px] text-slate-500 uppercase font-black">預計總收入</p>
            <p className="text-lg font-black">${stats.totalInc.toLocaleString()}</p>
          </div>
          <div className="bg-white/70 p-4 rounded-2xl border border-white">
            <p className="text-[10px] text-slate-500 uppercase font-black">預計總負擔</p>
            <p className="text-lg font-black text-rose-600">${stats.totalExp.toLocaleString()}</p>
          </div>
          <div className={`p-4 rounded-2xl ${isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-100'}`}>
            <p className="text-[10px] uppercase font-black opacity-80">預計結餘</p>
            <p className="text-lg font-black">${stats.remaining.toLocaleString()}</p>
          </div>
        </div>
      </div>

    

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Repeat className="w-4 h-4 text-indigo-500" /> 固定收支清單</h4>
          </div>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
            {recurringExpenses.length === 0 ? <div className="p-10 text-center text-xs text-slate-400 italic">尚未設定固定收支項目</div> :
              recurringExpenses.map(r => {
                const isEditing = editingId === r.id;
                return (
                  <div key={r.id} className={`transition-all ${isEditing ? 'bg-indigo-50 p-4' : 'p-4 hover:bg-slate-50'}`}>
                    {isEditing ? (
                      /* ⭐ 固定收支編輯模式 */
                      <div className="space-y-3 animate-in zoom-in-95 duration-200">
                        <input 
                          value={editForm.description} 
                          onChange={e => setEditForm({...editForm, description: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                          placeholder="描述"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input 
                              type="number" 
                              value={editForm.amount} 
                              onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-sm font-black text-indigo-600 outline-none"
                            />
                          </div>
                          <div className="relative">
                            <input 
                              type="number" 
                              value={editForm.dayOfMonth} 
                              onChange={e => setEditForm({...editForm, dayOfMonth: parseInt(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">號</span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="px-4 py-2 text-slate-400 font-bold text-xs"
                          >
                            取消
                          </button>
                          <button 
                            onClick={saveEdit} 
                            className="px-6 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" /> 
                            確定變更
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ⭐ 固定收支顯示模式 */
                      <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                          {r.type === TransactionType.INCOME ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                          <div>
                            <p className="text-xs font-bold text-slate-700">{r.description}</p>
                            <p className="text-[9px] text-slate-400">每月 {r.dayOfMonth} 日 • {r.type === TransactionType.INCOME ? '收入' : '支出'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-black ${r.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {r.type === TransactionType.INCOME ? '+' : '-'}${r.amount.toLocaleString()}
                          </span>
                          <div className="flex gap-2 ml-2"> 
                            <button 
                              onClick={() => startEdit(r)} 
                              className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                              title="編輯項目"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDeleteRecurring(r.id)} 
                              className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all"
                              title="刪除項目"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* 單次預計項目 (保持不變) */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> 單次預計項目</h4>
          </div>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
            {futureTransactions.length === 0 ? <div className="p-10 text-center text-xs text-slate-400 italic">無預計計劃項目</div> :
              futureTransactions.map(it => (
                <div key={it.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    {it.type === TransactionType.INCOME ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                    <div><p className="text-xs font-bold text-slate-700">{it.note || it.category}</p><p className="text-[9px] text-slate-400">{it.date}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black ${it.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>{it.type === TransactionType.INCOME ? '+' : '-'}${it.amount.toLocaleString()}</span>
                    <button onClick={() => onDelete(it.id)} className="p-1.5 text-slate-200 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CreditCardDebt } from '../types.ts';
import { CreditCard, Calendar, CheckCircle2, Trash2, ChevronRight, PieChart, ShieldCheck, AlertTriangle, Edit2, Check, X } from 'lucide-react';

interface CreditCardManagerProps {
  debts: CreditCardDebt[];
  onPayInstallment: (id: string) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (debt: CreditCardDebt) => void;
}

export const CreditCardManager: React.FC<CreditCardManagerProps> = ({ 
  debts, 
  onPayInstallment, 
  onDeleteDebt,
  onUpdateDebt
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreditCardDebt>>({});

  const stats = useMemo(() => {
    const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const monthlyTotal = debts.reduce((sum, d) => d.isPaidThisMonth ? sum : sum + d.monthlyAmount, 0);
    const paidCount = debts.filter(d => d.isPaidThisMonth).length;
    return { totalRemaining, monthlyTotal, paidCount };
  }, [debts]);

  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => a.paymentDay - b.paymentDay);
  }, [debts]);

  const startEditing = (debt: CreditCardDebt) => {
    setEditingId(debt.id);
    setEditForm(debt);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      onUpdateDebt(editForm as CreditCardDebt);
      setEditingId(null);
      setEditForm({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">總債務餘額</p>
          <p className="text-2xl font-bold text-slate-800">${stats.totalRemaining.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">本月尚待支付</p>
          <p className="text-2xl font-bold text-rose-500">${stats.monthlyTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">本月進度</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-emerald-500">{stats.paidCount} / {debts.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedDebts.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-400">
            <p className="font-medium">尚未建立分期明細</p>
          </div>
        ) : (
          sortedDebts.map(debt => {
            const isEditing = editingId === debt.id;
            const progress = (debt.installmentCurrent / debt.installmentTotal) * 100;
            const isCompleted = debt.installmentCurrent >= debt.installmentTotal;
            const remainingMonths = debt.installmentTotal - debt.installmentCurrent;

            return (
              <div key={debt.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden group transition-all ${isEditing ? 'ring-2 ring-indigo-500 border-indigo-200 shadow-lg scale-[1.02]' : 'border-slate-100 hover:ring-2 hover:ring-indigo-100'}`}>
                <div className="h-1.5 w-full bg-slate-50">
                  <div 
                    className={`h-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 w-full mr-2">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="w-full">
                        {isEditing ? (
                          <input 
                            value={editForm.cardName} 
                            onChange={e => setEditForm({...editForm, cardName: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm font-bold outline-none"
                            placeholder="債務名稱"
                            autoFocus
                          />
                        ) : (
                          <>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">{debt.cardName}</h4>
                            <p className="text-xs font-medium text-slate-400">每月 {debt.paymentDay} 日繳款</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={saveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="儲存"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEditing} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-all" title="取消"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(debt)} className="p-1.5 text-slate-200 hover:text-indigo-500 transition-all opacity-0 group-hover:opacity-100" title="編輯項目">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteDebt(debt.id)} className="p-1.5 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100" title="刪除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">剩餘餘額</p>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                          <input 
                            type="number"
                            value={editForm.remainingAmount} 
                            onChange={e => setEditForm({...editForm, remainingAmount: parseFloat(e.target.value) || 0})}
                            className="w-full bg-white border border-slate-200 rounded p-1 pl-3 text-xs font-bold outline-none"
                          />
                        </div>
                      ) : (
                        <p className="font-bold">${debt.remainingAmount.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">繳款日 (1-31)</p>
                      {isEditing ? (
                        <input 
                          type="number"
                          value={editForm.paymentDay} 
                          onChange={e => setEditForm({...editForm, paymentDay: parseInt(e.target.value) || 1})}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-xs font-bold outline-none"
                        />
                      ) : (
                        <p className="font-bold">{debt.paymentDay} 日</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">每期付款額</span>
                      {isEditing ? (
                        <div className="relative mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                          <input 
                            type="number"
                            value={editForm.monthlyAmount} 
                            onChange={e => setEditForm({...editForm, monthlyAmount: parseFloat(e.target.value) || 0})}
                            className="w-24 bg-slate-50 border border-indigo-200 rounded-lg p-2 pl-4 text-sm font-black text-indigo-600 outline-none"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-800">${debt.monthlyAmount.toLocaleString()}</span>
                      )}
                    </div>
                    
                    {!isEditing && (
                      <button
                        onClick={() => onPayInstallment(debt.id)}
                        disabled={debt.isPaidThisMonth || isCompleted}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                          debt.isPaidThisMonth ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white hover:bg-black shadow-md'
                        }`}
                      >
                        {debt.isPaidThisMonth ? '本月已付' : isCompleted ? '已結清' : '支付確認'}
                      </button>
                    )}
                    {isEditing && (
                       <button onClick={saveEdit} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                         儲存更新
                       </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Transaction, PaymentMethod, CreditCard, Account } from '../types.ts';
import { PlusCircle, CreditCard as CardIcon, Wallet, Calendar, Info, ArrowRight, Landmark, AlertCircle } from 'lucide-react';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  creditCards: CreditCard[];
  accounts: Account[];
  incomeCategories: string[];
  expenseCategories: string[];
  onOpenSettings: (tab: 'cards' | 'initial') => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAdd, creditCards, accounts, incomeCategories, expenseCategories, onOpenSettings 
}) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [accountId, setAccountId] = useState<string>('');
  const [creditCardId, setCreditCardId] = useState<string>('');
  const [category, setCategory] = useState<Category>(expenseCategories[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // ⭐ 修復 1：確保在 accounts 傳進來時，立刻鎖定第一個 ID
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      if (!accountId || !accounts.find(a => a.id === accountId)) {
        setAccountId(accounts[0].id);
      }
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (creditCards && creditCards.length > 0) {
      if (!creditCardId || !creditCards.find(c => c.id === creditCardId)) {
        setCreditCardId(creditCards[0].id);
      }
    }
  }, [creditCards, creditCardId]);

  useEffect(() => {
    if (type === TransactionType.INCOME) {
      setCategory(incomeCategories[0] || '其他');
      setPaymentMethod(PaymentMethod.CASH);
    } else {
      setCategory(expenseCategories[0] || '其他');
    }
  }, [type, incomeCategories, expenseCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (paymentMethod === PaymentMethod.CASH && !accountId) return;
    if (paymentMethod === PaymentMethod.CREDIT_CARD && !creditCardId) return;

    onAdd({
      amount: parseFloat(amount),
      type,
      category,
      note,
      date,
      paymentMethod,
      accountId: paymentMethod === PaymentMethod.CASH ? accountId : undefined,
      creditCardId: paymentMethod === PaymentMethod.CREDIT_CARD ? creditCardId : undefined
    });

    setAmount('');
    setNote('');
  };

  const currentCategories = type === TransactionType.INCOME ? incomeCategories : expenseCategories;
  const noCards = !creditCards || creditCards.length === 0;
  const noAccounts = !accounts || accounts.length === 0;

  return (
    <div className="bg-white p-4 sm:p-6">
      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-indigo-500" />
          快速記帳
        </div>
        {noAccounts && (
           <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg animate-pulse flex items-center gap-1">
             <AlertCircle className="w-3 h-3" /> 尚未設定帳戶
           </span>
        )}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">交易性質</label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
              >支出記錄</button>
              <button
                type="button"
                onClick={() => setType(TransactionType.INCOME)}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >收入記錄</button>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">支付工具與管道</label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                disabled={type === TransactionType.INCOME}
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.CASH ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'} ${type === TransactionType.INCOME ? 'opacity-50' : ''}`}
              ><Wallet className="w-4 h-4"/> 銀行 / 現金</button>
              <button
                type="button"
                disabled={type === TransactionType.INCOME}
                onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${paymentMethod === PaymentMethod.CREDIT_CARD ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'} ${type === TransactionType.INCOME ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              ><CardIcon className="w-4 h-4"/> 信用卡</button>
            </div>
            
            {/* 引導提示：無帳戶 */}
            {paymentMethod === PaymentMethod.CASH && noAccounts && (
              <div className="mt-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="p-2 bg-rose-500 rounded-lg text-white shadow-lg shadow-rose-200"><AlertCircle className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-xs font-black text-rose-900 leading-relaxed">
                    必須建立銀行帳戶或錢包才能記帳。
                  </p>
                  <button 
                    type="button"
                    onClick={() => onOpenSettings('initial')}
                    className="text-[10px] font-black text-rose-600 mt-1.5 flex items-center gap-1 hover:gap-2 transition-all underline decoration-2 underline-offset-4"
                  >
                    立刻前往「財富基石」設定帳戶 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ⭐ 修復 2：強制顯示銀行選單，即便正在載入中也要留出殼層 */}
        {paymentMethod === PaymentMethod.CASH && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">
              {type === TransactionType.INCOME ? '收款銀行/帳戶' : '付款銀行/帳戶'}
            </label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-black text-slate-700 outline-none h-[56px] appearance-none focus:bg-white focus:border-indigo-300 transition-all"
              >
                {noAccounts ? (
                  <option value="">-- 請先新增帳戶 --</option>
                ) : (
                  accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))
                )}
              </select>
              <Landmark className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* 信用卡選擇器 */}
        {paymentMethod === PaymentMethod.CREDIT_CARD && type === TransactionType.EXPENSE && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">扣款信用卡</label>
            <div className="relative">
              <select
                value={creditCardId}
                onChange={(e) => setCreditCardId(e.target.value)}
                className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 pl-10 text-sm font-black text-indigo-700 outline-none h-[56px] appearance-none focus:bg-white focus:border-indigo-300 transition-all"
              >
                {noCards ? (
                  <option value="">-- 請先新增信用卡 --</option>
                ) : (
                  creditCards.map(card => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))
                )}
              </select>
              <CardIcon className="w-4 h-4 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="w-full">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">交易日期</label>
            <div className="relative">
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none appearance-none h-[54px]" 
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="w-full">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">交易金額</label>
            <input 
              type="number" 
              inputMode="decimal"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder="0.00" 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-lg font-black outline-none h-[54px] focus:bg-white focus:border-indigo-300 transition-all" 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">類別標籤</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none h-[54px] focus:bg-white transition-all">
              {currentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">備註描述</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="點擊輸入備註..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none h-[54px] focus:bg-white transition-all" />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={noAccounts && paymentMethod === PaymentMethod.CASH}
          className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 mt-4 disabled:bg-slate-300 disabled:shadow-none"
        >
          {noAccounts ? '尚未設定帳戶' : '完成並新增記錄'}
        </button>
      </form>
    </div>
  );
};

import React, { useMemo } from 'react';
import { Transaction, TransactionType, CreditCardDebt, PaymentMethod, InitialData, Account, SavingsPlan } from '../types.ts';
import { Landmark, ShieldCheck, Wallet, Info, Sparkles, Globe, BarChart3, TrendingUp } from 'lucide-react';

interface BalanceSheetProps {
  transactions: Transaction[];
  cardDebts: CreditCardDebt[];
  creditCards: any[];
  recurringExpenses: any[];
  savingsPlans: SavingsPlan[];
  initialData: InitialData;
  onPayDebt: (id: string) => void;
}

export const BalanceSheet: React.FC<BalanceSheetProps> = ({ 
  transactions, 
  cardDebts,
  savingsPlans,
  initialData,
}) => {
  // 計算各帳戶原幣即時餘額
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    initialData.accounts.forEach(acc => { balances[acc.id] = acc.initialBalance; });

    transactions.forEach(t => {
      if (t.paymentMethod === PaymentMethod.CASH && t.accountId) {
        if (t.type === TransactionType.INCOME) {
          balances[t.accountId] = (balances[t.accountId] || 0) + t.amount;
        } else {
          balances[t.accountId] = (balances[t.accountId] || 0) - t.amount;
        }
      }
    });
    return balances;
  }, [transactions, initialData.accounts]);

  // 1. 總流動現金 (帳戶餘額 * 匯率)
  const totalCashAssetsTWD = useMemo(() => {
    return initialData.accounts.reduce((sum, acc) => {
      const nativeBalance = accountBalances[acc.id] || 0;
      const rate = acc.exchangeRate || 1;
      return sum + (nativeBalance * rate);
    }, 0);
  }, [accountBalances, initialData.accounts]);

  // 2. 圓夢基金
  const totalSavingsFunds = useMemo(() => {
    return savingsPlans.reduce((sum, p) => sum + p.currentAmount, 0);
  }, [savingsPlans]);

  // 3. 長期固定資產 (股票、房產等)
  const totalFixedAssets = useMemo(() => {
    return initialData.fixedAssets.reduce((sum, a) => sum + a.value, 0);
  }, [initialData.fixedAssets]);

  // 4. 信用卡待繳
  const totalCardUnpaid = useMemo(() => {
    return transactions
      .filter(t => t.paymentMethod === PaymentMethod.CREDIT_CARD && t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // 5. 分期債務餘額
  const totalDebtRemaining = useMemo(() => {
    return cardDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [cardDebts]);

  // 真實淨值 = (流動資產 + 圓夢基金 + 長期資產) - (信用卡債 + 分期債)
  const netWorth = (totalCashAssetsTWD + totalSavingsFunds + totalFixedAssets) - (totalCardUnpaid + totalDebtRemaining);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 真實淨值主卡片 */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Landmark className="w-20 h-20" /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  預估總資產淨值 (TWD) <ShieldCheck className="w-3 h-3" />
                </p>
                <h3 className="text-3xl font-black mt-1">${Math.round(netWorth).toLocaleString()}</h3>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl text-indigo-400"><TrendingUp className="w-5 h-5" /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] text-indigo-200 uppercase mb-1">現金/外幣總額</p>
                <p className="text-lg font-black text-emerald-400">${Math.round(totalCashAssetsTWD).toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm relative group">
                <BarChart3 className="absolute -top-1 -right-1 w-4 h-4 text-indigo-300 opacity-30" />
                <p className="text-[9px] text-indigo-200 uppercase mb-1">長期投資資產</p>
                <p className="text-lg font-black text-indigo-300">${totalFixedAssets.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] text-indigo-200 uppercase mb-1">信用卡待繳</p>
                <p className="text-lg font-black text-rose-400">-${totalCardUnpaid.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] text-indigo-200 uppercase mb-1">分期債務餘額</p>
                <p className="text-lg font-black text-rose-300">-${totalDebtRemaining.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 帳戶餘額明細 */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
               <Wallet className="w-4 h-4 text-emerald-500" /> 帳戶與錢包明細
             </h4>
             <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
            {initialData.accounts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                 <Info className="w-8 h-8 opacity-20" />
                 <p className="text-xs italic">尚未設定帳戶資料</p>
              </div>
            ) : (
              initialData.accounts.map(acc => {
                const nativeBalance = accountBalances[acc.id] || 0;
                const twdEquivalent = nativeBalance * (acc.exchangeRate || 1);
                const isForeign = acc.currency && acc.currency !== 'TWD';

                return (
                  <div key={acc.id} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-2xl border border-white group hover:bg-white hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isForeign ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {isForeign ? <Globe className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-700 block">{acc.name}</span>
                        {isForeign && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">1:{acc.exchangeRate}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black block ${nativeBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                        {acc.currency} {nativeBalance.toLocaleString()}
                      </span>
                      {isForeign && (
                        <span className="text-[10px] font-bold text-emerald-600/60 block mt-0.5">
                          ≈ ${Math.round(twdEquivalent).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

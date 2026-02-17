
import React, { useState, useEffect } from 'react';
import { CreditCardDebt } from '../types.ts';
import { CreditCard as CardIcon, DollarSign, Calendar, Hash, Percent } from 'lucide-react';

interface CreditCardFormProps {
  onAdd: (debt: Omit<CreditCardDebt, 'id' | 'isPaidThisMonth'>) => void;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({ onAdd }) => {
  const [cardName, setCardName] = useState('');
  const [totalDebt, setTotalDebt] = useState(''); // 本金
  const [installmentTotal, setInstallmentTotal] = useState('12');
  const [installmentCurrent, setInstallmentCurrent] = useState('0');
  const [monthlyAmount, setMonthlyAmount] = useState(''); // 每期實付 (含利息)
  const [paymentDay, setPaymentDay] = useState('15');

  // 當總額或期數改變時，自動推算一個基礎月付金作為參考
  useEffect(() => {
    const total = parseFloat(totalDebt);
    const iTotal = parseInt(installmentTotal);
    if (!isNaN(total) && iTotal > 0) {
      setMonthlyAmount(Math.round(total / iTotal).toString());
    }
  }, [totalDebt, installmentTotal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(totalDebt);
    const iTotal = parseInt(installmentTotal);
    const iCurrent = parseInt(installmentCurrent);
    const monthly = parseFloat(monthlyAmount);
    
    if (!cardName || isNaN(total) || isNaN(monthly)) return;

    // 剩餘總額 = 每期要繳的錢 * 剩餘還沒繳的期數
    const remaining = monthly * (iTotal - iCurrent);

    onAdd({
      cardName,
      totalDebt: total,
      remainingAmount: remaining,
      installmentTotal: iTotal,
      installmentCurrent: iCurrent,
      monthlyAmount: Math.round(monthly),
      paymentDay: parseInt(paymentDay)
    });
    
    // 重設表單
    setCardName('');
    setTotalDebt('');
    setMonthlyAmount('');
  };

  return (
    <div className="bg-white p-2">
      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <CardIcon className="w-5 h-5 text-rose-600" /> 建立債務/分期 (支援利息)
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">債務/分期名稱</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="例如：信貸、機車分期、手機分期"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200 h-[56px]"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">借款本金/總額</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={totalDebt}
                  onChange={(e) => setTotalDebt(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-lg font-black text-slate-700 outline-none h-[56px]"
                  required
                />
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-rose-500 uppercase mb-2 ml-1">每月應繳金額 (含利息)</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-rose-50 border border-rose-100 rounded-2xl p-4 pl-10 text-lg font-black text-rose-600 outline-none h-[56px]"
                  required
                />
                <Percent className="w-4 h-4 text-rose-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">總期數</label>
            <div className="relative">
              <input 
                type="number" 
                inputMode="numeric"
                value={installmentTotal} 
                onChange={(e) => setInstallmentTotal(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-bold outline-none h-[54px]" 
              />
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">已繳期數</label>
            <div className="relative">
              <input 
                type="number" 
                inputMode="numeric"
                value={installmentCurrent} 
                onChange={(e) => setInstallmentCurrent(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-bold outline-none h-[54px]" 
              />
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="space-y-2 xs:col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">每月繳款日</label>
            <div className="relative">
              <input 
                type="number" 
                inputMode="numeric"
                value={paymentDay} 
                onChange={(e) => setPaymentDay(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-10 text-sm font-bold outline-none h-[54px]" 
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
           <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">預估未來還款總支出</p>
           <p className="text-sm font-black text-slate-700">
             ${(parseFloat(monthlyAmount || '0') * (parseInt(installmentTotal) - parseInt(installmentCurrent))).toLocaleString()} 
             <span className="text-[10px] text-slate-400 font-normal ml-2">(包含剩餘本金與利息)</span>
           </p>
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-100 mt-4 mb-8">
          完成建立債務
        </button>
      </form>
    </div>
  );
};

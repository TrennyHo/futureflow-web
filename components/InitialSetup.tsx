
import React, { useState } from 'react';
import { InitialData, FixedAsset, Account } from '../types.ts';
import { Wallet, Plus, Trash2, Landmark, Sparkles, Globe, TrendingUp, BarChart3 } from 'lucide-react';

interface InitialSetupProps {
  initialData: InitialData;
  onSave: (data: InitialData) => void;
}

const CURRENCIES = [
  { code: 'TWD', symbol: '$', name: '新台幣' },
  { code: 'USD', symbol: '$', name: '美金' },
  { code: 'JPY', symbol: '¥', name: '日圓' },
  { code: 'EUR', symbol: '€', name: '歐元' },
  { code: 'CNY', symbol: '¥', name: '人民幣' },
];

export const InitialSetup: React.FC<InitialSetupProps> = ({ initialData, onSave }) => {
  // 帳戶表單狀態
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState('TWD');
  const [newAccRate, setNewAccRate] = useState('1');
  
  // 資產表單狀態
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetValue, setNewAssetValue] = useState('');

  const addAccount = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (newAccName.trim() && newAccBalance) {
      const newAcc: Account = {
        id: crypto.randomUUID(),
        name: newAccName.trim(),
        initialBalance: parseFloat(newAccBalance) || 0,
        currency: newAccCurrency,
        exchangeRate: newAccCurrency === 'TWD' ? 1 : parseFloat(newAccRate) || 1
      };
      onSave({
        ...initialData,
        accounts: [...initialData.accounts, newAcc]
      });
      setNewAccName('');
      setNewAccBalance('');
      setNewAccCurrency('TWD');
      setNewAccRate('1');
    }
  };

  const quickAddCashWallet = () => {
    const cashAcc: Account = {
      id: crypto.randomUUID(),
      name: "現金錢包 (口袋)",
      initialBalance: 0,
      currency: 'TWD',
      exchangeRate: 1
    };
    onSave({
      ...initialData,
      accounts: [...initialData.accounts, cashAcc]
    });
  };

  const updateAccount = (id: string, field: keyof Account, value: any) => {
    const updatedAccounts = initialData.accounts.map(acc => {
      if (acc.id === id) {
        return { ...acc, [field]: value };
      }
      return acc;
    });
    onSave({ ...initialData, accounts: updatedAccounts });
  };

  const removeAccount = (id: string) => {
    if (initialData.accounts.length <= 1) return;
    onSave({
      ...initialData,
      accounts: initialData.accounts.filter(a => a.id !== id)
    });
  };

  const addAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssetName.trim() && newAssetValue) {
      const newAsset: FixedAsset = {
        id: crypto.randomUUID(),
        name: newAssetName.trim(),
        value: parseFloat(newAssetValue) || 0
      };
      onSave({
        ...initialData,
        fixedAssets: [...initialData.fixedAssets, newAsset]
      });
      setNewAssetName('');
      setNewAssetValue('');
    }
  };

  const removeAsset = (id: string) => {
    onSave({
      ...initialData,
      fixedAssets: initialData.fixedAssets.filter(a => a.id !== id)
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-8">
      {/* 帳戶與外幣區塊 */}
      <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white">帳戶與外幣設定</h4>
              <p className="text-xs text-emerald-200/60 font-bold">管理您的流動資金、外幣儲蓄與現金錢包</p>
            </div>
          </div>
          <button 
            onClick={quickAddCashWallet}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-emerald-300 text-[10px] font-black rounded-xl flex items-center gap-2 border border-white/5 transition-all"
          >
            <Sparkles className="w-3 h-3" /> 一鍵建立：現金錢包
          </button>
        </div>

        <div className="space-y-3 mb-8">
          {initialData.accounts.map(acc => (
            <div key={acc.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
              <div className="sm:col-span-1 flex justify-center">
                 <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                   {acc.currency === 'TWD' ? <Wallet className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                 </div>
              </div>
              <div className="sm:col-span-4">
                <input 
                  value={acc.name}
                  onChange={e => updateAccount(acc.id, 'name', e.target.value)}
                  className="w-full bg-transparent border-none text-white text-sm font-black focus:ring-0 outline-none p-2"
                  placeholder="帳戶名稱"
                />
              </div>
              <div className="sm:col-span-2">
                <select 
                  value={acc.currency || 'TWD'}
                  onChange={e => updateAccount(acc.id, 'currency', e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs font-black text-indigo-300 outline-none cursor-pointer"
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 relative">
                <input 
                  type="number"
                  value={acc.initialBalance}
                  onChange={e => updateAccount(acc.id, 'initialBalance', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-sm font-black text-emerald-400 outline-none"
                />
              </div>
              <div className="sm:col-span-2 relative">
                {acc.currency !== 'TWD' && (
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.001"
                      value={acc.exchangeRate || 1}
                      onChange={e => updateAccount(acc.id, 'exchangeRate', parseFloat(e.target.value) || 1)}
                      className="w-full bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2 pl-6 text-[11px] font-black text-indigo-300 outline-none"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-indigo-300/40">匯</span>
                  </div>
                )}
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <button 
                  onClick={() => removeAccount(acc.id)} 
                  disabled={initialData.accounts.length <= 1}
                  className="p-2 text-white/10 hover:text-rose-500 transition-all disabled:opacity-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addAccount} className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-6 border-dashed">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">帳戶/外幣資產名稱</label>
              <input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="如：美金定存、日幣錢包" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-emerald-400" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">幣別</label>
              <select value={newAccCurrency} onChange={e => setNewAccCurrency(e.target.value)} className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">初始原幣金額</label>
              <input type="number" value={newAccBalance} onChange={e => setNewAccBalance(e.target.value)} placeholder="0" className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-emerald-400" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-white/40 uppercase mb-2">換算匯率</label>
              <input type="number" step="0.001" value={newAccRate} onChange={e => setNewAccRate(e.target.value)} disabled={newAccCurrency === 'TWD'} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none disabled:opacity-30" />
            </div>
            <button type="submit" className="sm:col-span-2 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 h-[46px]">
              <Plus className="w-4 h-4" /> 新增帳戶
            </button>
          </div>
        </form>
      </div>

      {/* 長期資產與投資區塊 */}
      <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white">長期資產與投資明細</h4>
            <p className="text-xs text-indigo-200/60 font-bold">記錄您的股票市值、基金現值、房地產或儲蓄險</p>
          </div>
        </div>

        <form onSubmit={addAsset} className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-8">
          <div className="sm:col-span-6">
            <input value={newAssetName} onChange={e => setNewAssetName(e.target.value)} placeholder="資產名稱 (如：台積電股票、台北公寓)" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-400" required />
          </div>
          <div className="sm:col-span-4 relative">
            <input type="number" value={newAssetValue} onChange={e => setNewAssetValue(e.target.value)} placeholder="預估台幣現值" className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 pl-10 text-sm font-black text-white outline-none focus:border-indigo-400" required />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">$</span>
          </div>
          <button type="submit" className="sm:col-span-2 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-900/20">
            <Plus className="w-4 h-4" /> 新增資產
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialData.fixedAssets.length === 0 ? (
            <div className="col-span-full py-8 text-center text-indigo-300/30 italic text-xs border-2 border-dashed border-white/5 rounded-2xl">
              尚未記錄任何長期資產
            </div>
          ) : (
            initialData.fixedAssets.map(asset => (
              <div key={asset.id} className="flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-black text-white">{asset.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-base font-black text-indigo-300">${asset.value.toLocaleString()}</span>
                  <button onClick={() => removeAsset(asset.id)} className="p-2 text-white/10 hover:text-rose-500 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

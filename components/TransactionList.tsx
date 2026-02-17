
import React, { useState } from 'react';
import { Transaction, TransactionType, Account, CreditCard, PaymentMethod } from '../types.ts';
import { 
  Trash2, ShoppingBag, Utensils, Bus, Play, Wallet, Heart, Zap, Home, 
  DollarSign, Bookmark, Store, Building2, Tag, Edit2, Check, X,
  Truck, FileText, Users, Landmark, CreditCard as CardIcon, Calendar, Info
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (updated: Transaction) => void;
  accounts: Account[];
  creditCards: CreditCard[];
  incomeCategories: string[];
  expenseCategories: string[];
}

const CategoryIcon = ({ category }: { category: string }) => {
  const props = { className: "w-4 h-4" };
  switch (category) {
    case '蝦皮收入': case '網拍收入': case '網拍': return <Store {...props} />;
    case '租金收入': case '租金': return <Building2 {...props} />;
    case '銷售收入': case '銷售': return <Tag {...props} />;
    case '薪資': case '薪水': return <DollarSign {...props} />;
    case '投資': case '股票': return <Wallet {...props} />;
    case '進貨成本': return <Truck {...props} />;
    case '稅務成本': return <FileText {...props} />;
    case '工資': return <Users {...props} />;
    case '餐飲': case '吃飯': return <Utensils {...props} />;
    case '交通': case '油錢': return <Bus {...props} />;
    case '娛樂': case '玩樂': return <Play {...props} />;
    case '購物': case '買東西': return <ShoppingBag {...props} />;
    case '水電費': case '電費': case '水費': return <Zap {...props} />;
    case '居住': case '房租': return <Home {...props} />;
    case '醫療健康': case '醫療': case '看病': return <Heart {...props} />;
    case '債務': case '還款': return <Landmark {...props} />;
    default: return <Bookmark {...props} />;
  }
};

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, onDelete, onUpdate, accounts, creditCards, incomeCategories, expenseCategories 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    // ⭐ 確保所有欄位都完整帶入，特別是 category
    setEditForm({ 
      ...t,
      category: t.category || (t.type === TransactionType.INCOME ? incomeCategories[0] : expenseCategories[0])
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm && editForm.amount && editForm.amount > 0) {
      onUpdate(editForm as Transaction);
      setEditingId(null);
      setEditForm({});
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <h3 className="text-sm font-black text-slate-800">最近流水記錄</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{transactions.length} 筆</span>
      </div>
      <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
        {transactions.length === 0 ? (
          <div className="p-16 text-center text-slate-300 italic text-xs">
            尚無交易記錄
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {transactions.map((t) => {
              const isEditing = editingId === t.id;
              const account = accounts.find(a => a.id === t.accountId);
              const card = creditCards.find(c => c.id === t.creditCardId);
              const sourceLabel = account ? account.name : card ? card.name : '未指定';

              return (
                <li key={t.id} className={`transition-all duration-300 ${isEditing ? 'bg-indigo-50/50 p-6' : 'hover:bg-slate-50/80 p-5'}`}>
                  {isEditing ? (
                    /* 編輯模式：展開的卡片佈局 */
                    <div className="space-y-4 animate-in zoom-in-95 duration-200 bg-slate-50/50 p-4 rounded-3xl border border-indigo-100/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                           <div className="p-2 bg-indigo-600 rounded-lg text-white">
                             <Edit2 className="w-3.5 h-3.5" />
                           </div>
                           <span className="text-xs font-black text-indigo-900">調整帳目明細</span>
                        </div>
                        <button onClick={cancelEditing} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* 備註欄位：單獨一橫列，不跟別人擠 */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">項目名稱/備註</label>
                          <input 
                            value={editForm.note || ''} 
                            onChange={e => setEditForm({...editForm, note: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400 shadow-sm"
                          />
                        </div>

                        {/* 金額與日期：在手機上會自動變兩列，不擁擠 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">金額</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                              <input 
                                type="number"
                                value={editForm.amount} 
                                onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pl-7 text-sm font-black text-indigo-600 outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">日期</label>
                            <input 
                              type="date"
                              value={editForm.date}
                              onChange={e => setEditForm({...editForm, date: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none"
                            />
                          </div>
                        </div>

                        {/* 分類：特別加上了安全保護 || [] 避免白屏 */}
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1">分類標籤</label>
                          <select 
                            value={editForm.category || ''} 
                            onChange={e => setEditForm({...editForm, category: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer focus:border-indigo-400"
                          >
                            {/* 🛡️ 第一重保護：顯示當前已選分類 */}
                            {editForm.category && <option value={editForm.category}>{editForm.category}</option>}

                            {/* 🛡️ 第二重保護：如果沒傳進來，就用這套預設分類 */}
                            {((editForm.type === 'INCOME' ? incomeCategories : expenseCategories)?.length > 0 
                              ? (editForm.type === 'INCOME' ? incomeCategories : expenseCategories)
                              : (editForm.type === 'INCOME' ? ['薪資', '投資', '網拍收入', '其他'] : ['餐飲', '交通', '購物', '居住', '水電費', '其他'])
                            ).map(cat => (
                              /* 這裡要多加一個判斷，避免重複顯示已選分類 */
                              cat !== editForm.category && <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                         <button 
                           onClick={cancelEditing} 
                           className="flex-1 py-3 text-xs font-black text-slate-400 bg-white border border-slate-200 rounded-xl"
                         >
                           放棄
                         </button>
                         <button 
                           onClick={saveEdit}
                           disabled={!editForm.amount || editForm.amount <= 0}
                           className="flex-[2] py-3 bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                         >
                           儲存變更
                         </button>
                      </div>
                    </div>
                  ) : (
                    /* 瀏覽模式：原本的精美記錄佈局 */
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                          t.type === TransactionType.INCOME 
                            ? 'bg-emerald-100 text-emerald-600 shadow-sm' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <CategoryIcon category={t.category} />
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="font-black text-slate-800 text-sm truncate">{t.note || t.category}</p>
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md shrink-0 uppercase tracking-tighter">
                               {t.category}
                             </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">{t.date}</span>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                              {t.paymentMethod === PaymentMethod.CASH ? <Landmark className="w-2.5 h-2.5 text-indigo-400" /> : <CardIcon className="w-2.5 h-2.5 text-indigo-400" />}
                              <span className="text-[10px] font-black text-indigo-400/80">{sourceLabel}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="text-right">
                          <p className={`font-black text-base ${
                            t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* ✏️ 編輯鉛筆按鈕 */}
                          <button 
                            onClick={() => startEditing(t)} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                            title="編輯項目"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {/* 🗑️ 刪除垃圾桶按鈕 */}
                          <button 
                            onClick={() => onDelete(t.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" 
                            title="刪除項目"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

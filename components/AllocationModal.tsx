import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Wallet, Target, Save } from 'lucide-react';

export const AllocationModal: React.FC<any> = ({ isOpen, onClose, data, onConfirm }) => {
    const [livingAmount, setLivingAmount] = useState(0);
    const [strategicAllocations, setStrategicAllocations] = useState<any[]>([]);

    useEffect(() => {
        if (data && data.advice) {
            // 🚀 確保數據存在才初始化，並給予空陣列作為後路
            setLivingAmount(data.advice.living || 0);
            setStrategicAllocations(data.advice.strategic ? [...data.advice.strategic] : []);
        }
    }, [data]);

    if (!isOpen || !data) return null;

    const survivalTotal = data.advice.survival ? data.advice.survival.reduce((s: any, i: any) => s + (Number(i.amount) || 0), 0) : 0;
    const strategicTotal = strategicAllocations.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const currentFreeCash = Number(data.income.amount) - survivalTotal - livingAmount - strategicTotal;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black">收支決策批閱</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Income Allocation Advice</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-black text-slate-500 uppercase">本次入帳總額</span>
                        <span className="text-xl font-black text-emerald-600">${Number(data.income.amount).toLocaleString()}</span>
                    </div>

                    {/* 1. 生存保衛 */}
                    {data.advice.survival && data.advice.survival.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3 text-rose-500">
                                <ShieldCheck size={18} />
                                <span className="font-black text-[10px] uppercase tracking-wider">生存保衛 (優先扣除)</span>
                            </div>
                            {data.advice.survival.map((d: any, i: number) => (
                                <div key={i} className="flex justify-between p-3 bg-rose-50 rounded-xl mb-2">
                                    <span className="text-xs font-bold text-slate-700">{d.name}</span>
                                    <span className="text-xs font-black text-rose-600">${Number(d.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* 2. 生活預留 (可調整) */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 text-blue-500">
                            <Wallet size={18} />
                            <span className="font-black text-[10px] uppercase tracking-wider">生活預留</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                            <span className="text-xs font-bold text-slate-700 flex-1">預留飯錢</span>
                            <input
                                type="number"
                                // 💡 總裁秘訣：如果數字是 0 就顯示空字串，方便直接輸入
                                value={livingAmount === 0 ? '' : livingAmount}
                                onChange={(e) => setLivingAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                                className="w-24 bg-white border border-blue-200 rounded-lg px-2 py-1 text-right font-black text-sm text-blue-600 outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="0"
                            />
                        </div>
                    </section>

                    {/* 3. 夢想比例 (可調整) */}
                    <section>
                        <div className="flex items-center gap-2 mb-3 text-emerald-600">
                            <Target size={18} />
                            <span className="font-black text-[10px] uppercase tracking-wider">夢想計畫撥款</span>
                        </div>
                        {strategicAllocations.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-2">
                                <span className="text-xs font-bold text-slate-700 flex-1">{s.name}</span>
                                <input
                                    type="number"
                                    value={s.amount === 0 ? '' : s.amount}
                                    onChange={(e) => {
                                        const next = [...strategicAllocations];
                                        next[i].amount = e.target.value === '' ? 0 : Number(e.target.value);
                                        setStrategicAllocations(next);
                                    }}
                                    className="w-24 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-right font-black text-sm text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-400"
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </section>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase">剩餘自由現金</span>
                        <span className={`text-lg font-black ${currentFreeCash >= 0 ? 'text-slate-900' : 'text-rose-500'}`}>
                            ${currentFreeCash.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="p-6 bg-slate-50">
                    <button
                        onClick={() => onConfirm({
                            ...data.advice,
                            living: livingAmount,
                            strategic: strategicAllocations,
                            freeCash: currentFreeCash
                        })}
                        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                    >
                        <Save size={18} /> 確認分配並執行
                    </button>
                </div>
            </div>
        </div>
    );
};
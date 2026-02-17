
import React, { useState } from 'react';
// Corrected import to use the newly defined Payable type from types.ts
import { Payable } from '../types.ts';
import { FileText, Calendar, DollarSign } from 'lucide-react';

interface PayableFormProps {
  onAdd: (payable: Omit<Payable, 'id' | 'isPaid'>) => void;
}

export const PayableForm: React.FC<PayableFormProps> = ({ onAdd }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    onAdd({
      amount: parseFloat(amount),
      description,
      dueDate
    });

    setAmount('');
    setDescription('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-rose-500" />
        新增待付款項 (負債)
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">款項描述</label>
          <div className="relative">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：房租、信用卡卡費"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              required
            />
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">金額</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">支付期限</label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 pl-10 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
        >
          記入待付清單
        </button>
      </form>
    </div>
  );
};


import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Transaction } from '../types.ts';
import { getFinancialInsights } from '../services/geminiService.ts';

interface AIAdvisorProps {
  transactions: Transaction[];
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ transactions }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    const result = await getFinancialInsights(transactions);
    setInsight(result);
    setLoading(false);
  };

  return (
    <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-200" />
          <h3 className="text-xl font-bold">AI 理財管家</h3>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading || transactions.length === 0}
          className="bg-white/20 hover:bg-white/30 disabled:opacity-50 p-2 rounded-lg transition-all"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        </button>
      </div>

      {!insight ? (
        <p className="text-indigo-100">
          點擊按鈕讓 AI 分析您的收支狀況，並提供專屬建議！
        </p>
      ) : (
        <div className="prose prose-invert max-w-none">
          <div className="text-indigo-50 whitespace-pre-wrap leading-relaxed text-sm">
            {insight}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-indigo-200">
        <span>Powered by Gemini AI</span>
        <span>資料僅供參考</span>
      </div>
    </div>
  );
};

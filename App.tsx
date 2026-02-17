import React, { useState, useEffect } from 'react';
import {
  Transaction, TransactionType, CreditCardDebt,
  CreditCard, PaymentMethod, RecurringExpense, InitialData, Account, SavingsPlan
} from './types.ts';


// 1. 組件導入區  
import { TransactionForm } from './components/TransactionForm.tsx';
import { BudgetMonitor } from './components/BudgetMonitor.tsx';
import { TransactionList } from './components/TransactionList.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { AIAdvisor } from './components/AIAdvisor.tsx';
import { BalanceSheet } from './components/BalanceSheet.tsx';
import { CreditCardManager } from './components/CreditCardManager.tsx';
import { CreditCardForm } from './components/CreditCardForm.tsx';
import { BudgetPlanner } from './components/BudgetPlanner.tsx';
import { CreditCardTable } from './components/CreditCardTable.tsx';
import { InitialSetup } from './components/InitialSetup.tsx';
import { SavingsPlanner } from './components/SavingsPlanner.tsx';
// ⭐ 正式引入日曆組件
import { TransactionCalendar } from './components/TransactionCalendar';
import { format, addDays } from 'date-fns';

import { AllocationModal } from './components/AllocationModal';
/**
 * 總裁專屬：圖示強制顯影引擎
 * 原因：esm.sh 傳回的是物件格式，React 19 需要透過此方法強制轉譯為 SVG 組件
 */
// ✅ 只匯入您有需要的圖示
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  Calendar as CalendarIcon,
  TrendingUp,
  Settings,
  ChevronDown // 剛才新增帳本切換功能需要的
} from 'lucide-react';

// 2. 補齊所有變數，特別是造成崩潰的 ShieldAlert
const Target = createIcon('Target');
const ShieldCheck = createIcon('ShieldCheck');
const ShieldAlert = createIcon('ShieldAlert'); // 👈 救命恩人：修正債務分頁空白
const BarChart3 = createIcon('BarChart3');
const PlusCircle = createIcon('PlusCircle');
const PieChart = createIcon('PieChart');
const CardIcon = createIcon('CreditCard');
const Tags = createIcon('Tags');
const Settings = createIcon('Settings');
const LogOut = createIcon('LogOut');
const X = createIcon('X');
const Trash2 = createIcon('Trash2');
const Landmark = createIcon('Landmark');
const Wallet = createIcon('Wallet');
const Sparkles = createIcon('Sparkles');
const CheckCircle2 = createIcon('CheckCircle2');
const ArrowRight = createIcon('ArrowRight');
const Trophy = createIcon('Trophy');
const Calendar = createIcon('Calendar');
const Loader2 = createIcon('Loader2');
const ChevronLeft = createIcon('ChevronLeft');
const ChevronRight = createIcon('ChevronRight');
const TrendingUp = createIcon('TrendingUp');
const TrendingDown = createIcon('TrendingDown');
const [activeTab, setActiveTab] = useState('input');
// 🚀 新增：帳本狀態管理
const [ledgers, setLedgers] = useState([
  { id: 'personal', name: '🏠 個人生活' },
  { id: 'business', name: '💼 公司業務' },
  { id: 'travel', name: '✈️ 日本旅遊' }
]);
const [activeLedgerId, setActiveLedgerId] = useState('personal');
const distributeIncome = (
  amount: number,
  upcomingDebts: any[],
  savingsPlans: any[],
  daysToNextIncome: number = 7,
  dailyBase: number = 500 // 🚀 這裡新增參數，接收使用者設定的日預算
) => {
  let remaining = amount;
  const result = {
    survival: [] as any[],
    living: 0,
    strategic: [] as any[]
  };

  // 1. 【生存】優先處理即將到期的關鍵債務
  upcomingDebts.forEach(debt => {
    if (remaining > 0) {
      const gap = debt.amount || 0;
      const pay = Math.min(remaining, gap);
      if (pay > 0) {
        result.survival.push({ name: debt.name || '未命名債務', amount: pay });
        remaining -= pay;
      }
    }
  });

  // 2. 【生活】根據使用者設定的 dailyBase 來預留飯錢
  // 💡 不再死扣 500，而是用傳入的 dailyBase
  const livingNeeds = daysToNextIncome * dailyBase;
  result.living = Math.min(remaining, livingNeeds);
  remaining -= result.living;

  // 3. 【夢想】剩餘金額按比例分配
  if (remaining > 0) {
    savingsPlans.forEach(plan => {
      if (plan.allocationPercentage && plan.allocationPercentage > 0) {
        const pay = Math.floor(remaining * (plan.allocationPercentage / 100));
        if (pay > 0) {
          result.strategic.push({ name: plan.name, amount: pay });
        }
      }
    });

    const totalStrategic = result.strategic.reduce((sum, item) => sum + item.amount, 0);
    remaining -= totalStrategic;
  }

  return { ...result, freeCash: remaining };
};

// 3. Firebase 邏輯區
import { auth, loginWithGoogle, logout, onAuthStateChanged, getUserLedger, saveUserLedger } from './firebase';
const LOGO_URL = `/logo.png?v=${Date.now()}`;
const FALLBACK_LOGO = 'https://cdn-icons-png.flaticon.com/512/2845/2845812.png';
const DEFAULT_INC_CATS = ['薪資', '投資', '獎金', '網拍收入', '租金收入', '其他'];
const DEFAULT_EXP_CATS = ['餐飲', '交通', '購物', '居住', '水電費', '娛樂', '醫療', '教育', '儲蓄提撥', '其他'];
const App: React.FC = () => {
  const [reportMode, setReportMode] = useState<'stats' | 'calendar' | 'forecast'>('stats');
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardDebts, setCardDebts] = useState<CreditCardDebt[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [initialData, setInitialData] = useState<InitialData & { isPremium?: boolean; createdAt?: number; premiumUntil?: any }>({
    accounts: [],
    fixedAssets: [],
    categoryBudgets: [] // ⭐ 這裡一定要加這一行，給預算一個「家」
  });
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INC_CATS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXP_CATS);
  const [dailySpendingGoal, setDailySpendingGoal] = useState<number>(500);
  const [activeTab, setActiveTab] = useState<'input' | 'daily' | 'savings' | 'budget' | 'cards'>('input');
  const [inputSubTab, setInputSubTab] = useState<'daily' | 'debt' | 'recurring'>('daily');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'cards' | 'initial'>('cards');
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  // 🚀 總裁決策引擎狀態：存放待審核的分配提案
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<{
    income: Transaction;
    advice: ReturnType<typeof distributeIncome>;
  } | null>(null);

  // 🛡️ 1. 版本管家：強迫手機抓取最新部署，防止舊版快取導致歸零 [cite: 2026-02-02]
  useEffect(() => {
    const VERSION_TAG = '20260209-FINAL-V1';
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== VERSION_TAG) {
      localStorage.setItem('app_version', VERSION_TAG);
      window.location.reload();
    }
  }, []);

  // 2. 存檔邏輯區：修正權限與目標存檔
  useEffect(() => {
    // 🛡️ 安全攔截器：確保資料已準備好才寫入
    if (!isReady || !user || !initialData?.accounts || initialData.accounts.length === 0) {
      return;
    }

    const timer = setTimeout(async () => {
      console.log(`💾 系統備份中... 目標: ${user.email}`);

      const dataToSave = {
        userEmail: user.email,
        initialData: {
          ...initialData,
          // 🚀 只有在資料庫真的完全沒這筆資料時才初始化日期，否則保持原樣
          createdAt: initialData.createdAt || Date.now(),
        },
        transactions,
        cardDebts,
        creditCards,
        recurringExpenses,
        savingsPlans,
        incomeCategories,
        expenseCategories,
        lastUpdated: Date.now()
      };

      try {
        await saveUserLedger(user.uid, dataToSave);
      } catch (err) {
        console.error("❌ 備份失敗:", err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [transactions, cardDebts, creditCards, recurringExpenses, savingsPlans, initialData, isReady, user]);

  // ==========================================
  // 核心戰略：資產初始讀取與歸位
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (currentUser: any) => {
      setIsReady(false);
      setUser(currentUser);

      if (currentUser) {
        try {
          console.log(`[系統] 正在調閱帳戶: ${currentUser.email}...`);
          let cloudData = await getUserLedger(currentUser.uid);

          // ⭐ 救援補丁：搬運舊資產
          const isNewUser = !cloudData || !cloudData.transactions || cloudData.transactions.length === 0;
          if (isNewUser) {
            const oldUID = "lgx8vnTipfaL9e4TbyIBYAA1MFL2";
            const oldData = await getUserLedger(oldUID);
            if (oldData) {
              cloudData = oldData;
              await saveUserLedger(currentUser.uid, oldData);
            }
          }

          if (cloudData) {
            setTransactions(cloudData.transactions || []);
            setCardDebts(cloudData.cardDebts || []);
            setCreditCards(cloudData.creditCards || []);
            setRecurringExpenses(cloudData.recurringExpenses || []);
            setSavingsPlans(cloudData.savingsPlans || []);
            setInitialData(cloudData.initialData || { accounts: [], fixedAssets: [], categoryBudgets: [] });
            setIncomeCategories(cloudData.incomeCategories || DEFAULT_INC_CATS);
            setExpenseCategories(cloudData.expenseCategories || DEFAULT_EXP_CATS);
          }
        } catch (e) {
          console.error("❌ 雲端讀取失敗：", e);
        }
      }
      setIsReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 🚀 決策執行：分配提案
  const handleConfirmAllocation = async (finalAdvice: any) => {
    const updatedPlans = savingsPlans.map(plan => {
      const match = finalAdvice.strategic.find((s: any) => s.name === plan.name);
      return match ? { ...plan, currentAmount: (plan.currentAmount || 0) + match.amount } : plan;
    });
    setSavingsPlans(updatedPlans);

    if (user && isReady) {
      try {
        await saveUserLedger(user.uid, {
          userEmail: user.email,
          initialData,
          transactions,
          cardDebts,
          creditCards,
          recurringExpenses,
          savingsPlans: updatedPlans,
          incomeCategories,
          expenseCategories,
          lastUpdated: Date.now()
        });
      } catch (e) {
        console.error("❌ 批閱存檔失敗：", e);
      }
    }
    setShowAllocationModal(false);
    setPendingAllocation(null);
  };

  // 🚀 總裁記帳核心：處理新交易並攔截收入提案
  const handleAddTransaction = async (newT: Omit<Transaction, 'id'>) => {
    const t: Transaction = { ...newT, id: crypto.randomUUID() };

    // 1. 更新本地交易清單並排序
    const updatedTransactions = [t, ...transactions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setTransactions(updatedTransactions);

    // 2. 戰略攔截：如果是收入，觸發分配彈窗
    if (t.type === TransactionType.INCOME) {
      const advice = distributeIncome(
        t.amount,
        cardDebts,
        savingsPlans,
        7,
        dailySpendingGoal
      );
      setPendingAllocation({ income: t, advice: advice });
      setShowAllocationModal(true);
    }

    // 3. 同步雲端：僅存下交易，不改動 SavingsPlans (等待 Modal 確認)
    if (user && isReady) {
      try {
        await saveUserLedger(user.uid, {
          userEmail: user.email || "",
          isPremium: initialData?.isPremium || false,
          createdAt: initialData?.createdAt || Date.now(),
          premiumUntil: initialData?.premiumUntil || null,
          transactions: updatedTransactions,
          cardDebts: cardDebts || [],
          creditCards: creditCards || [],
          recurringExpenses: recurringExpenses || [],
          savingsPlans: savingsPlans, // 🛡️ 保持原始狀態，由 Modal 負責更新後的存檔
          initialData: {
            accounts: initialData?.accounts || [],
            fixedAssets: initialData?.fixedAssets || [],
            categoryBudgets: initialData?.categoryBudgets || []
          },
          incomeCategories: incomeCategories || [],
          expenseCategories: expenseCategories || []
        });
        console.log("✅ 總裁，交易紀錄已安全同步至雲端");
      } catch (e) {
        console.error("❌ 存檔失敗：", e);
      }
    }

    // 4. 切換頁面
    setActiveTab('daily');
  };

  // 1. 雲端同步助手 (防止格式錯誤)
  const syncAllToCloud = async (currentTs: Transaction[], currentDebts: CreditCardDebt[]) => {
    if (!user || !isReady) return;
    try {
      await saveUserLedger(user.uid, {
        userEmail: user.email || "",
        transactions: currentTs,
        cardDebts: currentDebts, // 💰 確保這裡的變數名稱與 Dashboard 接收的一致
        creditCards,
        recurringExpenses,
        savingsPlans,
        initialData,
        incomeCategories,
        expenseCategories
      });
    } catch (e) { console.error("❌ 同步失敗：", e); }
  };

  // 2. 債務修改函數 (這就是錯誤訊息中遺失的函數)
  const handleUpdateDebt = async (updatedDebt: CreditCardDebt) => {
    const newDebts = cardDebts.map(d => (d.id === updatedDebt.id ? updatedDebt : d));
    setCardDebts(newDebts);
    if (user && isReady) {
      await syncAllToCloud(transactions, newDebts);
    }
  };

  // ⭐ 這裡是要新增的更新收支函數
  const handleUpdateTransaction = async (updated: Transaction) => {
    // 1. 先更新本地 UI 狀態
    const updatedTs = transactions.map(t => t.id === updated.id ? updated : t);
    setTransactions(updatedTs);

    // 2. 立即將變動推送到 Firebase (確保資料不歸零) [cite: 2026-02-03]
    if (user && isReady) {
      try {
        // 使用您現有的 syncAllToCloud 助手
        await syncAllToCloud(updatedTs, cardDebts);
        console.log("💎 交易記錄已安全更新並同步");
      } catch (e) {
        console.error("❌ 同步失敗：", e);
      }
    }
  };

  // ⭐ 總裁級補丁：專門處理「固定收支」項目的修改
  // App.tsx 內部的 handleUpdateRecurring
  const handleUpdateRecurring = async (updated: RecurringExpense) => {
    // 1. 本地狀態立刻變更（總裁要看見即時效果）
    const nextRecurring = recurringExpenses.map(item =>
      item.id === updated.id ? updated : item
    );
    setRecurringExpenses(nextRecurring);

    // 2. ⭐ 核心補丁：立即同步到雲端
    if (user && isReady) {
      try {
        // 這裡一定要傳入最新的 nextRecurring，不要用舊的 state
        await saveUserLedger(user.uid, {
          ...initialData, // 展開原本的其他資料
          transactions,
          cardDebts,
          creditCards,
          recurringExpenses: nextRecurring, // 💡 關鍵：傳入更新後的這份
          savingsPlans,
          incomeCategories,
          expenseCategories
        });
        console.log("💎 總裁，固定收支設定已永久儲存！");
      } catch (e) {
        console.error("❌ 同步失敗：", e);
      }
    }
  };

  // ⭐ 總裁級：預算額度更新邏輯
  const handleUpdateBudget = (category: string, limit: number) => {
    setInitialData(prev => {
      // 確保 prev 有 categoryBudgets
      const currentBudgets = prev.categoryBudgets || [];
      const exists = currentBudgets.find(b => b.category === category);

      let newBudgets;
      if (exists) {
        newBudgets = currentBudgets.map(b =>
          b.category === category ? { ...b, limit } : b
        );
      } else {
        newBudgets = [...currentBudgets, { category, limit }];
      }

      // ⭐ 總裁級重點：必須返回一個「全新」的物件，React 才會偵測到變化並更新輸入框
      return {
        ...prev,
        categoryBudgets: newBudgets
      };
    });
  };
  // ⭐ 新增：圓夢更新邏輯 [cite: 2026-01-30]
  const handleUpdatePlan = (id: string, newAmount: number) => {
    setSavingsPlans(prev => prev.map(p => p.id === id ? { ...p, currentAmount: newAmount } : p));
  };

  // ⭐ 總裁版：債務自動還款邏輯 (優化立即同步)
  const handlePayCardInstallment = async (id: string) => {
    let nextTransactions = [...transactions];

    const nextDebts = cardDebts.map(debt => {
      if (debt.id === id && !debt.isPaidThisMonth) {
        // 1. 產生一筆新的支出紀錄
        const newExp: Transaction = {
          id: crypto.randomUUID(),
          amount: debt.monthlyAmount,
          type: TransactionType.EXPENSE,
          category: '債務',
          note: `還款: ${debt.cardName}`,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: PaymentMethod.CASH,
          accountId: initialData.accounts[0]?.id
        };

        nextTransactions = [newExp, ...nextTransactions];

        // 2. 更新債務剩餘期數與金額
        return {
          ...debt,
          installmentCurrent: debt.installmentCurrent + 1,
          remainingAmount: Math.max(0, debt.remainingAmount - debt.monthlyAmount),
          isPaidThisMonth: true
        };
      }
      return debt;
    });

    // 3. 更新畫面狀態
    setTransactions(nextTransactions);
    setCardDebts(nextDebts);

    // 4. ⭐ 關鍵：立即同步到雲端 (這就是您問的那一段)
    if (user && isReady) {
      await syncAllToCloud(nextTransactions, nextDebts);
    }
  };

  if (!isReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600 w-10 h-10" /></div>;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-center">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-md w-full animate-in zoom-in-95">
        <h1 className="text-3xl font-black mb-1">森活科技</h1>
        <p className="text-slate-400 text-xs font-bold mb-8 uppercase tracking-widest">FutureFlow Asset Manager</p>
        <button onClick={loginWithGoogle} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-[2rem] mt-10 shadow-xl flex items-center justify-center gap-3">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          使用 Google 帳號登入
        </button>
        <p className="mt-8 text-[10px] text-slate-400 font-bold px-4 leading-relaxed">新用戶享 14 天免費試用期，資料將安全同步至您的個人雲端。</p>
      </div>
    </div>
  );

  const needsSetup = initialData.accounts.length === 0 || creditCards.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">

      {/* ⭐ 修正後：註解現在被正確包裹，文字會消失，邏輯會啟動 [cite: 2026-02-02] */}
      {/* ⭐ 企業級授權攔截器：30 天試用與授權判定 */}
      {user && isReady && (() => {
        const now = Date.now();
        const createdAt = initialData.createdAt || now;

        // A. 判定正式授權 (isPremium)
        const hasValidPremium = initialData.isPremium && (
          initialData.premiumUntil === null ||
          (initialData.premiumUntil.toMillis ? initialData.premiumUntil.toMillis() : initialData.premiumUntil) > now
        );

        // B. 判定 30 天試用期
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const trialExpiry = createdAt + THIRTY_DAYS_MS;
        const isTrialing = now <= trialExpiry;

        // C. 鎖定邏輯
        if (!hasValidPremium && !isTrialing) return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">服務授權已到期</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                您的 30 天試用期或授權已結束。<br />請聯繫系統管理員申請開通正式版。
              </p>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-8 cursor-pointer active:scale-95 transition-all"
                onClick={() => { navigator.clipboard.writeText(user.uid); alert('辨識碼已複製'); }}>
                <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">系統辨識碼 (點擊複製)</p>
                <p className="text-xs font-mono font-bold text-slate-600 truncate">{user.uid}</p>
              </div>

              <div className="space-y-4">
                <a href="https://lin.ee/xxxx" target="_blank" rel="noreferrer" className="block w-full bg-[#06C755] text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                  聯繫官方客服申請授權
                </a>
                <button onClick={() => logout()} className="w-full text-slate-400 font-bold py-2 text-xs">登出帳戶</button>
              </div>
            </div>
          </div>
        );
        return null;
      })()}

      <header className="bg-white border-b sticky top-0 z-[100] h-16 px-4 flex items-center shadow-sm">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center gap-2">

          {/* 1. Logo 區：維持森活科技的專業形象 */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src={LOGO_URL}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 object-cover"
              alt="logo"
              onError={(e: any) => e.target.src = FALLBACK_LOGO}
            />
            <div className="hidden xs:flex flex-col leading-none">
              <h1 className="text-sm font-black text-slate-800">森活科技</h1>
              <span className="text-[9px] font-black text-emerald-600 uppercase">FutureFlow</span>
            </div>
          </div>

          {/* 2. 導航區：核心戰略分頁 (圖示顯影增強版) */}
          <nav className="flex bg-slate-100 p-1 rounded-2xl flex-1 max-w-[400px] mx-1 sm:mx-4">
            {[
              { id: 'input', label: '記帳', icon: PlusCircle },
              { id: 'daily', label: '報表', icon: BarChart3 },
              { id: 'savings', label: '目標', icon: Target },
              { id: 'cards', label: '債務', icon: CardIcon },
            ].map((tab) => {
              // 🛡️ 提取對應的圖示組件
              const IconComponent = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-1 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-black rounded-xl transition-all ${activeTab === tab.id
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {/* ⭐ 這是您之前漏掉的關鍵：Icon 本尊！ */}
                  {IconComponent && (
                    <IconComponent
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'text-emerald-500' : 'text-slate-400'
                        }`}
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. 工具區：刪除雞肋列印鈕，回歸純粹管理 */}
          <div className="flex items-center gap-0 sm:gap-1 shrink-0">
            {/* 🟢 已裁撤 Printer 按鈕，減少視覺雜訊 */}

            <button
              onClick={() => setShowCategorySettings(true)}
              className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
              title="類別設定"
            >
              <Tags className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
              title="系統設定"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* 🔴 登出按鈕：維持醒目紅色，確保總裁安全離場 */}
            <button
              onClick={() => {
                if (window.confirm('總裁，確定要登出並結束本次財務巡視嗎？')) {
                  logout();
                }
              }}
              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl ml-1 transition-all"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* --- 🚀 新增：帳本切換器 --- */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 flex justify-between items-center">
        <div className="relative group">
          <button className="flex items-center gap-2 text-xl font-black text-slate-800">
            {ledgers.find(l => l.id === activeLedgerId)?.name}
            <ChevronDown size={20} className="text-slate-400" />
          </button>

          {/* 下拉選單 (簡單版) */}
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block z-50">
            {ledgers.map(ledger => (
              <button
                key={ledger.id}
                onClick={() => setActiveLedgerId(ledger.id)}
                className={`w-full text-left px-5 py-3 text-sm font-bold hover:bg-slate-50 transition-colors ${activeLedgerId === ledger.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
              >
                {ledger.name}
              </button>
            ))}
            <div className="border-t border-slate-100 p-2">
              <button className="w-full text-center text-xs font-black text-slate-400 hover:text-indigo-500 py-2">
                + 新增帳本
              </button>
            </div>
          </div>
        </div>

        {/* 右邊可以是設定按鈕 */}
        <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
          <Settings size={20} />
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* --- 系統設定區塊 --- */}
        {showSettings && (
          <div className="mb-8 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl animate-in slide-in-from-top-4 border border-slate-800">
            <div className="flex bg-white/10 p-1.5 rounded-2xl mb-8 w-fit">
              <button onClick={() => setSettingsTab('cards')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${settingsTab === 'cards' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>信用卡管理</button>
              <button onClick={() => setSettingsTab('initial')} className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all ${settingsTab === 'initial' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>帳戶資產</button>
            </div>
            {settingsTab === 'cards' ? (
              <div className="space-y-6">
                <CreditCardTable cards={creditCards} onDelete={(id) => setCreditCards(prev => prev.filter(c => c.id !== id))} />
                <CardAddForm onAdd={(n: any, c: any, p: any) => setCreditCards(prev => [...prev, { id: crypto.randomUUID(), name: n, closingDay: c, paymentDay: p, color: '#10b981' }])} />
              </div>
            ) : <InitialSetup initialData={initialData} onSave={setInitialData} />}
          </div>
        )}

        <div className="animate-in fade-in duration-500 pb-24 sm:pb-8">
          {/* --- 1. 記帳模式 --- */}
          {activeTab === 'input' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {needsSetup && !showSettings && (
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl flex items-center gap-5">
                  <div className="p-4 bg-white/20 rounded-3xl"><Sparkles className="w-8 h-8" /></div>
                  <div className="flex-1 text-white">
                    <h3 className="text-base font-black">歡迎使用 FutureFlow！</h3>
                    <p className="text-xs font-bold mt-1">請先建立銀行帳戶與信用卡，開啟理財之旅。</p>
                  </div>
                  <button onClick={() => setShowSettings(true)} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black">前往設定</button>
                </div>
              )}
              <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100">
                <button onClick={() => setInputSubTab('daily')} className={`flex-1 py-3.5 text-xs font-black rounded-2xl transition-all ${inputSubTab === 'daily' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>生活收支</button>
                <button onClick={() => setInputSubTab('recurring')} className={`flex-1 py-3.5 text-xs font-black rounded-2xl transition-all ${inputSubTab === 'recurring' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>固定收支</button>
                <button onClick={() => setInputSubTab('debt')} className={`flex-1 py-3.5 text-xs font-black rounded-2xl transition-all ${inputSubTab === 'debt' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>建立負債</button>
              </div>
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-2 overflow-visible">
                {inputSubTab === 'daily' && <TransactionForm onAdd={handleAddTransaction} creditCards={creditCards} accounts={initialData.accounts} incomeCategories={incomeCategories} expenseCategories={expenseCategories} onOpenSettings={(tab: any) => { setShowSettings(true); setSettingsTab(tab); }} />}
                {inputSubTab === 'debt' && <div className="p-6"><CreditCardForm onAdd={(newD) => { setCardDebts(prev => [...prev, { ...newD, id: crypto.randomUUID(), isPaidThisMonth: false }]); setActiveTab('cards'); }} /></div>}
                {inputSubTab === 'recurring' && <div className="p-6"><RecurringForm onAdd={(item: any) => { setRecurringExpenses(prev => [...prev, { ...item, id: crypto.randomUUID() }]); setActiveTab('budget'); }} creditCards={creditCards} accounts={initialData.accounts} incomeCategories={incomeCategories} expenseCategories={expenseCategories} /></div>}
              </div>
              <AIAdvisor transactions={transactions} />
            </div>
          )}

          {/* --- 2. 報表模式 --- */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {/* 子導航切換鈕 */}
              <div className="flex justify-center mb-8">
                <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
                  {[
                    { id: 'stats', label: '數據顯示' },
                    { id: 'calendar', label: '日曆顯示' },
                    { id: 'forecast', label: '支出預測' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setReportMode(mode.id as any)}
                      className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${reportMode === mode.id ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* A. 數據統計模式 */}
                {reportMode === 'stats' && (
                  <div className="space-y-8">
                    <BudgetMonitor transactions={transactions} budgets={initialData.categoryBudgets || []} />
                    <BalanceSheet transactions={transactions} cardDebts={cardDebts} creditCards={creditCards} recurringExpenses={recurringExpenses} savingsPlans={savingsPlans} initialData={initialData} onPayDebt={handlePayCardInstallment} />
                    <BudgetPlanner transactions={transactions} cardDebts={cardDebts} creditCards={creditCards} recurringExpenses={recurringExpenses} onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(i => i.id !== id))} onUpdateRecurring={handleUpdateRecurring} />
                    <div className="w-full"><Dashboard transactions={transactions} cardDebts={cardDebts} /></div>
                  </div>
                )}

                {/* B. 日曆戰報模式 */}
                {reportMode === 'calendar' && (
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                    {/* 左側：核心日曆組件 */}
                    <div className="lg:col-span-8">
                      <TransactionCalendar transactions={transactions} onDateClick={(date) => setSelectedDate(date)} />
                    </div>

                    {/* 右側：當日細節戰報 */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[500px] flex flex-col">
                        {/* 標題區 */}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tighter">{selectedDate}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Intelligence Report</p>
                          </div>
                          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <Calendar size={20} strokeWidth={3} />
                          </div>
                        </div>

                        {/* 交易列表區 */}
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                          {transactions.filter(t => t.date === selectedDate).length > 0 ? (
                            transactions.filter(t => t.date === selectedDate).map((t) => (
                              <div key={t.id} className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col gap-3 group hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all duration-300">

                                {/* 第一層：分類與金額 */}
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${t.type.toLowerCase() === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                      {t.type.toLowerCase() === 'income' ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
                                    </div>
                                    <input
                                      type="text"
                                      value={t.category}
                                      onChange={(e) => handleUpdateTransaction({ ...t, category: e.target.value })}
                                      className="bg-transparent text-xs font-black text-slate-700 outline-none w-24 focus:text-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-black ${t.type.toLowerCase() === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {t.type.toLowerCase() === 'income' ? '+' : '-'}
                                    </span>
                                    <input
                                      type="number"
                                      value={t.amount}
                                      onChange={(e) => handleUpdateTransaction({ ...t, amount: Number(e.target.value) })}
                                      className={`w-20 bg-transparent text-sm font-black text-right outline-none focus:text-indigo-600 ${t.type.toLowerCase() === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}
                                    />
                                  </div>
                                </div>

                                {/* 第二層：備註與支付方式 */}
                                <div className="flex justify-between items-end pl-11">
                                  <div className="flex flex-col gap-1 flex-1">
                                    <input
                                      type="text"
                                      value={t.note || ''}
                                      placeholder="點擊新增備註..."
                                      onChange={(e) => handleUpdateTransaction({ ...t, note: e.target.value })}
                                      className="bg-transparent text-[10px] text-slate-400 font-bold outline-none w-full focus:text-slate-600"
                                    />

                                    {/* 支付細節顯示 */}
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${t.paymentMethod === PaymentMethod.CREDIT_CARD ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {t.paymentMethod === PaymentMethod.CREDIT_CARD
                                          ? `信用卡 (${creditCards.find(c => c.id === t.creditCardId)?.name || t.cardName || '未知卡片'}) · 預計下期扣款`
                                          : `現金/銀行 (${initialData.accounts.find(a => a.id === t.accountId)?.name || '預設帳戶'})`}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => { if (window.confirm('確定銷毀此紀錄？')) setTransactions(prev => prev.filter(x => x.id !== t.id)) }}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                                <Sparkles size={24} className="opacity-20" />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em]">尚無作戰紀錄</p>
                            </div>
                          )}
                        </div>

                        {/* 底部：當日結算統計 */}
                        {transactions.filter(t => t.date === selectedDate).length > 0 && (
                          <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">當日淨結算</span>
                              <span className={`text-lg font-black ${transactions.filter(t => t.date === selectedDate).reduce((sum, t) => t.type.toLowerCase() === 'income' ? sum + Number(t.amount) : sum - Number(t.amount), 0) >= 0
                                ? 'text-emerald-600' : 'text-rose-500'
                                }`}>
                                ${transactions.filter(t => t.date === selectedDate).reduce((sum, t) => t.type.toLowerCase() === 'income' ? sum + Number(t.amount) : sum - Number(t.amount), 0).toLocaleString()}
                              </span>
                            </div>
                            {/* 提示信用卡隱藏債務 */}
                            {transactions.filter(t => t.date === selectedDate && t.paymentMethod === PaymentMethod.CREDIT_CARD).length > 0 && (
                              <div className="bg-indigo-50/50 p-2 rounded-xl flex items-center gap-2">
                                <ShieldAlert size={10} className="text-indigo-400" />
                                <span className="text-[8px] font-bold text-indigo-400 uppercase">含信用卡遞延支出，請留意未來現金流預演</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* C. 支出預測模式 (週支出清單版) */}
                {reportMode === 'forecast' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                          <h3 className="text-2xl font-black italic tracking-tighter uppercase">支出預測</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Weekly Expense Outlook</p>
                        </div>
                        {/* 這裡不再顯示餘額，改顯示未來 8 週總支出預測 */}
                        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl text-right">
                          <p className="text-[9px] text-rose-500 font-black uppercase">未來 8 週總支出預估</p>
                          <p className="text-sm font-mono font-black text-white">
                            Payment Required
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 relative z-10">
                        {(() => {
                          // ==========================================
                          // 1. 建立「未來支出行事曆」 (只算支出！)
                          // ==========================================
                          const expenseCalendar: Record<string, number> = {};
                          const addExpense = (dateStr: string, amount: number) => {
                            if (!expenseCalendar[dateStr]) expenseCalendar[dateStr] = 0;
                            expenseCalendar[dateStr] += amount;
                          };

                          // A. 信用卡單筆消費 (推算繳款日)
                          transactions.forEach(t => {
                            if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD) {
                              const card = creditCards.find(c => c.id === t.creditCardId || c.name === t.cardName);
                              if (card) {
                                const txDate = new Date(t.date);
                                const closingDay = card.closingDay || 10;
                                const paymentDay = card.paymentDay || 25;

                                // 計算繳款日
                                let payDate = new Date(txDate);
                                if (txDate.getDate() > closingDay) payDate.setMonth(payDate.getMonth() + 1);
                                payDate.setDate(paymentDay);
                                if (paymentDay < closingDay) payDate.setMonth(payDate.getMonth() + 1);

                                // 只有未來的才算
                                if (payDate > new Date()) {
                                  addExpense(format(payDate, 'yyyy-MM-dd'), Number(t.amount));
                                }
                              }
                            }
                          });

                          // B. 分期債務 (未來 3 個月)
                          cardDebts.forEach(debt => {
                            if (!debt.isPaidThisMonth) {
                              const card = creditCards.find(c => c.name === debt.cardName);
                              const pDay = card?.paymentDay || 25;
                              for (let i = 0; i < 3; i++) {
                                const d = new Date(); d.setMonth(d.getMonth() + i); d.setDate(pDay);
                                if (d > new Date()) addExpense(format(d, 'yyyy-MM-dd'), Number(debt.monthlyAmount));
                              }
                            }
                          });

                          // C. 固定支出 (未來 60 天，只算 Expense)
                          for (let i = 0; i < 60; i++) {
                            const d = addDays(new Date(), i);
                            const dayNum = d.getDate();
                            const dateStr = format(d, 'yyyy-MM-dd');

                            recurringExpenses.forEach(re => {
                              // 只計算支出，不計算收入
                              if (re.dayOfMonth === dayNum && re.type.toUpperCase() === 'EXPENSE') {
                                addExpense(dateStr, Number(re.amount));
                              }
                            });
                          }

                          // ==========================================
                          // 2. 顯示每週需支付金額 (不累計)
                          // ==========================================
                          return Array.from({ length: 8 }).map((_, i) => {
                            const weekStart = addDays(new Date(), i * 7);
                            const weekEnd = addDays(weekStart, 6);
                            const weekNum = i + 1;

                            // 統計這一週的總支出
                            let weeklyTotalExpense = 0;
                            for (let d = 0; d < 7; d++) {
                              const dayStr = format(addDays(weekStart, d), 'yyyy-MM-dd');
                              if (expenseCalendar[dayStr]) {
                                weeklyTotalExpense += expenseCalendar[dayStr];
                              }
                            }

                            return (
                              <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${weeklyTotalExpense > 0 ? 'bg-rose-600/10 border-rose-500/40' : 'bg-white/5 border-white/5 opacity-50'}`}>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-slate-500">W{weekNum}</span>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">
                                      {format(weekStart, 'MM/dd')} - {format(weekEnd, 'MM/dd')}
                                    </span>
                                  </div>
                                  {weeklyTotalExpense > 0 ? (
                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter animate-pulse">
                                      ⚠️ 本週有支出帳單
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-500">無預定支出</span>
                                  )}
                                </div>

                                <div className="text-right">
                                  <span className={`text-2xl font-mono font-black ${weeklyTotalExpense > 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                                    ${weeklyTotalExpense.toLocaleString()}
                                  </span>
                                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">需準備現金</p>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- 3. 圓夢分頁 --- */}
          {activeTab === 'savings' && (
            <SavingsPlanner
              plans={savingsPlans}
              transactions={transactions}
              accounts={initialData.accounts}
              onAdd={(p) => setSavingsPlans(prev => [...prev, { ...p, id: crypto.randomUUID() }])}
              onDelete={(id) => setSavingsPlans(prev => prev.filter(p => p.id !== id))}
              onUpdatePlan={handleUpdatePlan}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {/* --- 4. 計劃分頁 --- */}
          {activeTab === 'budget' && (
            <BudgetPlanner
              transactions={transactions}
              cardDebts={cardDebts}
              creditCards={creditCards}
              recurringExpenses={recurringExpenses}
              onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))}
              onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(i => i.id !== id))}
              onUpdateRecurring={handleUpdateRecurring}
            />
          )}

          {/* --- 5. 債務分頁 --- */}
          {activeTab === 'cards' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
              <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800">分期債務償還進度</h3>
                  <p className="text-xs text-slate-400 mt-1">追蹤您的借貸、手機與分期付款記錄</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl text-rose-500">
                  <ShieldAlert size={24} />
                </div>
              </div>
              <CreditCardManager
                debts={cardDebts}
                onPayInstallment={handlePayCardInstallment}
                onDeleteDebt={(id) => setCardDebts(prev => prev.filter(d => d.id !== id))}
                onUpdateDebt={handleUpdateDebt}
              />
            </div>
          )}
        </div>
      </main>

      {/* 底部導覽 (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t px-6 pt-3 pb-8 flex justify-between items-center z-[200] rounded-t-[2rem] shadow-2xl sm:hidden">
        {[
          { id: 'input', label: '記帳', icon: PlusCircle },
          { id: 'daily', label: '報表', icon: BarChart3 },
          { id: 'savings', label: '目標', icon: Target },
          { id: 'budget', label: '計劃', icon: PieChart },
          { id: 'cards', label: '債務', icon: CardIcon }
        ].map((config) => {
          const IconComponent = config.icon;
          return (
            <button key={config.id} onClick={() => setActiveTab(config.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === config.id ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
              <div className={`p-1.5 rounded-xl ${activeTab === config.id ? 'bg-emerald-50' : ''}`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black">{config.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 決策彈窗 */}
      <AllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        data={pendingAllocation} // 💡 這裡原本寫錯成 allocationData，請改成 pendingAllocation
        onConfirm={handleConfirmAllocation}
      />

      {/* 類別設定彈窗 */}
      {
        showCategorySettings && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setShowCategorySettings(false)} className="absolute top-7 right-7 text-slate-300 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-xl font-black mb-8 flex items-center gap-2"><Tags className="text-emerald-500" /> 類別管理中心</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <CategoryList title="收入來源" categories={incomeCategories} setCategories={setIncomeCategories} color="emerald" />
                <CategoryList title="支出項目" categories={expenseCategories} setCategories={setExpenseCategories} color="rose" budgets={initialData.categoryBudgets} onUpdateBudget={handleUpdateBudget} />
              </div>
              <button onClick={() => setShowCategorySettings(false)} className="w-full mt-8 bg-slate-900 text-white font-black py-4.5 rounded-2xl shadow-xl">完成變更</button>
            </div>
          </div>
        )
      }
    </div >
  );
};

// 輔助組件區域
const CategoryList: React.FC<any> = ({ title, categories, setCategories, color, budgets, onUpdateBudget }) => {
  return (
    <div className="space-y-4">
      <div className={`bg-${color}-50 px-4 py-2 rounded-xl text-${color}-800 text-[10px] font-black uppercase tracking-widest`}>{title}</div>
      <div className="grid grid-cols-1 gap-2">
        {categories.map((c: string) => {
          const budgetObj = (budgets || []).find((b: any) => b.category === c);
          return (
            <div key={c} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold">{c}</span>
                <button onClick={() => setCategories(categories.filter((x: string) => x !== c))} className="text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {title === "支出項目" && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400">預算:</span>
                  <input type="number" value={budgetObj ? budgetObj.limit : ''} onChange={(e) => onUpdateBudget(c, e.target.value === '' ? 0 : Number(e.target.value))} className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-indigo-600" placeholder="月額度" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CardAddForm: React.FC<any> = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [closing, setClosing] = useState('10');
  const [payment, setPayment] = useState('25');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mt-4">
      <div className="sm:col-span-2 space-y-2"><label className="text-[10px] text-emerald-300 font-black">卡片名稱</label><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-3.5 text-sm text-white" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2 text-center"><label className="text-[10px] text-slate-400 font-black">結帳日</label><input type="number" value={closing} onChange={e => setClosing(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-white text-center" /></div>
        <div className="space-y-2 text-center"><label className="text-[10px] text-slate-400 font-black">繳款日</label><input type="number" value={payment} onChange={e => setPayment(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-white text-center" /></div>
      </div>
      <button onClick={() => { if (name) { onAdd(name, parseInt(closing), parseInt(payment)); setName(''); } }} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg">儲存</button>
    </div>
  );
};

// 重點修復：RecurringForm 
const RecurringForm: React.FC<any> = ({ onAdd, incomeCategories, expenseCategories, accounts, creditCards }) => {
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [pm, setPm] = useState('CASH');
  const [day, setDay] = useState('1');
  const [cat, setCat] = useState('');
  const [accId, setAccId] = useState('');
  const [cardId, setCardId] = useState('');

  useEffect(() => { setCat(type === 'INCOME' ? (incomeCategories[0] || '') : (expenseCategories[0] || '')); }, [type, incomeCategories, expenseCategories]);
  useEffect(() => { if (accounts?.length > 0 && !accId) setAccId(accounts[0].id); }, [accounts]);
  useEffect(() => { if (creditCards?.length > 0 && !cardId) setCardId(creditCards[0].id); }, [creditCards]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd({ description: desc, amount: parseFloat(amt), type, dayOfMonth: parseInt(day), category: cat, paymentMethod: pm, accountId: pm === 'CASH' ? accId : undefined, creditCardId: pm === 'CREDIT_CARD' ? cardId : undefined }); setDesc(''); setAmt(''); }} className="space-y-6">
      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 text-xs font-black rounded-xl ${type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>定期支出</button>
        <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 text-xs font-black rounded-xl ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>定期收入</button>
      </div>
      <div className="space-y-4">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="定期項目名稱" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold" required />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="金額" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black" required />
          <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-black" required />
        </div>
      </div>
      <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl">儲存定期項目</button>
    </form>
  );
};

export default App;
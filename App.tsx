import React, { useState, useEffect } from 'react';
import {
  Transaction, TransactionType, CreditCardDebt,
  CreditCard, PaymentMethod, RecurringExpense, InitialData, Account, SavingsPlan
} from './types';

// 1. 組件導入區
import { TransactionForm } from './components/TransactionForm';
import { BudgetMonitor } from './components/BudgetMonitor';
import { Dashboard } from './components/Dashboard';
import { AIAdvisor } from './components/AIAdvisor';
import { BalanceSheet } from './components/BalanceSheet';
import { CreditCardManager } from './components/CreditCardManager';
import { CreditCardForm } from './components/CreditCardForm';
import { BudgetPlanner } from './components/BudgetPlanner';
import { CreditCardTable } from './components/CreditCardTable';
import { InitialSetup } from './components/InitialSetup';
import { SavingsPlanner } from './components/SavingsPlanner';
import { TransactionCalendar } from './components/TransactionCalendar';
import { AllocationModal } from './components/AllocationModal';

// 日期處理
import { format, addDays } from 'date-fns';

// 3. Firebase 邏輯區
import { auth, loginWithGoogle, logout, onAuthStateChanged, getUserLedger, saveUserLedger } from './firebase';

// 4. 標準圖示導入
import {
  LayoutDashboard,
  Wallet,
  CreditCard as CreditCardIcon,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  PlusCircle,
  PieChart,
  Tags,
  LogOut,
  X,
  Trash2,
  Landmark,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Trophy,
  Loader2,
  Edit2, // 新增編輯圖示
  Plus   // 新增加號圖示
} from 'lucide-react';

// ==========================================
// 輔助函數：收入分配邏輯
// ==========================================
const distributeIncome = (
  amount: number,
  upcomingDebts: any[],
  savingsPlans: any[],
  daysToNextIncome: number = 7,
  dailyBase: number = 500
) => {
  let remaining = amount;
  const result = {
    survival: [] as any[],
    living: 0,
    strategic: [] as any[]
  };

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

  const livingNeeds = daysToNextIncome * dailyBase;
  result.living = Math.min(remaining, livingNeeds);
  remaining -= result.living;

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

// ==========================================
// 主應用程式 App
// ==========================================
const LOGO_URL = `/logo.png?v=${Date.now()}`;
const FALLBACK_LOGO = 'https://cdn-icons-png.flaticon.com/512/2845/2845812.png';
const DEFAULT_INC_CATS = ['薪資', '投資', '獎金', '網拍收入', '租金收入', '其他'];
const DEFAULT_EXP_CATS = ['餐飲', '交通', '購物', '居住', '水電費', '娛樂', '醫療', '教育', '儲蓄提撥', '其他'];

const App: React.FC = () => {
  // 狀態宣告
  const [reportMode, setReportMode] = useState<'stats' | 'calendar' | 'forecast'>('stats');
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 資料庫 (Master Data)
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardDebts, setCardDebts] = useState<CreditCardDebt[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [initialData, setInitialData] = useState<InitialData & { isPremium?: boolean; createdAt?: number; premiumUntil?: any }>({
    accounts: [],
    fixedAssets: [],
    categoryBudgets: []
  });
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INC_CATS);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXP_CATS);
  const [dailySpendingGoal, setDailySpendingGoal] = useState<number>(500);

  // 頁面導航狀態
  const [activeTab, setActiveTab] = useState<'input' | 'daily' | 'savings' | 'budget' | 'cards'>('input');
  const [inputSubTab, setInputSubTab] = useState<'daily' | 'debt' | 'recurring'>('daily');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'cards' | 'initial'>('cards');
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // 🚀 多帳本系統 (Ledger System)
  const [ledgers, setLedgers] = useState<{ id: string, name: string }[]>([
    { id: 'personal', name: '🏠 個人生活' },
    { id: 'business', name: '💼 公司業務' },
    { id: 'travel', name: '✈️ 日本旅遊' }
  ]);
  const [activeLedgerId, setActiveLedgerId] = useState('personal');
  const [showLedgerManager, setShowLedgerManager] = useState(false); // 控制帳本管理彈窗

  // ⭐ 核心過濾器
  const displayedTransactions = transactions.filter(t => (t.ledgerId || 'personal') === activeLedgerId);
  const displayedDebts = cardDebts.filter(d => ((d as any).ledgerId || 'personal') === activeLedgerId);
  const displayedRecurring = recurringExpenses.filter(r => ((r as any).ledgerId || 'personal') === activeLedgerId);
  const displayedPlans = savingsPlans.filter(p => ((p as any).ledgerId || 'personal') === activeLedgerId);

  // 決策引擎狀態
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<{
    income: Transaction;
    advice: ReturnType<typeof distributeIncome>;
    futureObligations?: number;
  } | null>(null);

  // 版本控制
  useEffect(() => {
    const VERSION_TAG = '20260218-LedgerManager';
    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== VERSION_TAG) {
      localStorage.setItem('app_version', VERSION_TAG);
      if (lastVersion) window.location.reload();
    }
  }, []);

  // 自動存檔 (包含 ledgers)
  useEffect(() => {
    if (!isReady || !user || !initialData?.accounts || initialData.accounts.length === 0) return;
    const timer = setTimeout(async () => {
      console.log(`💾 系統備份中... 目標: ${user.email}`);
      const dataToSave = {
        userEmail: user.email,
        initialData: { ...initialData, createdAt: initialData.createdAt || Date.now() },
        transactions, cardDebts, creditCards, recurringExpenses, savingsPlans, incomeCategories, expenseCategories,
        ledgers, // 👈 關鍵：現在連帳本列表也會存檔了
        lastUpdated: Date.now()
      };
      try { await saveUserLedger(user.uid, dataToSave); } catch (err) { console.error("❌ 備份失敗:", err); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [transactions, cardDebts, creditCards, recurringExpenses, savingsPlans, initialData, isReady, user, incomeCategories, expenseCategories, ledgers]);

  // 初始讀取
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (currentUser: any) => {
      setIsReady(false);
      setUser(currentUser);
      if (currentUser) {
        try {
          console.log(`[系統] 正在調閱帳戶: ${currentUser.email}...`);
          let cloudData = await getUserLedger(currentUser.uid);

          if (!cloudData || !cloudData.transactions || cloudData.transactions.length === 0) {
            const oldUID = "lgx8vnTipfaL9e4TbyIBYAA1MFL2";
            const oldData = await getUserLedger(oldUID);
            if (oldData) { cloudData = oldData; await saveUserLedger(currentUser.uid, oldData); }
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
            // 讀取帳本列表 (如果沒有則使用預設)
            if (cloudData.ledgers && cloudData.ledgers.length > 0) {
              setLedgers(cloudData.ledgers);
            }
          }
        } catch (e) { console.error("❌ 雲端讀取失敗：", e); }
      }
      setIsReady(true);
    });
    return () => unsubscribe();
  }, []);

  const syncAllToCloud = async (currentTs: Transaction[], currentDebts: CreditCardDebt[]) => {
    if (!user || !isReady) return;
    try {
      await saveUserLedger(user.uid, {
        userEmail: user.email || "",
        transactions: currentTs,
        cardDebts: currentDebts,
        creditCards, recurringExpenses, savingsPlans, initialData, incomeCategories, expenseCategories,
        ledgers // 👈 同步時也要帶上帳本
      });
    } catch (e) { console.error("❌ 同步失敗：", e); }
  };

  const handleAddTransaction = async (newT: Omit<Transaction, 'id'>) => {
    const t: Transaction = {
      ...newT,
      id: crypto.randomUUID(),
      ledgerId: activeLedgerId
    };
    const updatedTransactions = [t, ...transactions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setTransactions(updatedTransactions);

    if (t.type === TransactionType.INCOME) {
      // 💡 算出未來 8 週的「現實壓力」 (約 2 個月)
      let futureTotal = 0;
      displayedRecurring.forEach(re => {
        if (re.type.toUpperCase() === 'EXPENSE') futureTotal += Number(re.amount) * 2;
      });
      displayedDebts.forEach(debt => {
        if (!debt.isPaidThisMonth) futureTotal += Number(debt.monthlyAmount) * 2;
      });

      const advice = distributeIncome(t.amount, displayedDebts, displayedPlans, 7, dailySpendingGoal);

      // 把 futureTotal 一起傳進去
      setPendingAllocation({ income: t, advice: advice, futureObligations: futureTotal });
      setShowAllocationModal(true);
    }

    if (user && isReady) await syncAllToCloud(updatedTransactions, cardDebts);
    setActiveTab('daily');
  };

  const handleUpdateTransaction = async (updated: Transaction) => {
    const updatedTs = transactions.map(t => t.id === updated.id ? updated : t);
    setTransactions(updatedTs);
    if (user && isReady) await syncAllToCloud(updatedTs, cardDebts);
  };

  const handleAddRecurring = (item: any) => {
    const newItem = { ...item, id: crypto.randomUUID(), ledgerId: activeLedgerId };
    setRecurringExpenses(prev => [...prev, newItem]);
    setActiveTab('budget');
  };

  const handleUpdateRecurring = async (updated: RecurringExpense) => {
    const nextRecurring = recurringExpenses.map(item => item.id === updated.id ? updated : item);
    setRecurringExpenses(nextRecurring);
    if (user && isReady) {
      await saveUserLedger(user.uid, {
        ...initialData, transactions, cardDebts, creditCards, savingsPlans, incomeCategories, expenseCategories,
        recurringExpenses: nextRecurring, ledgers
      });
    }
  };

  const handleAddDebt = (newD: any) => {
    const debtWithLedger = { ...newD, id: crypto.randomUUID(), isPaidThisMonth: false, ledgerId: activeLedgerId };
    setCardDebts(prev => [...prev, debtWithLedger]);
    setActiveTab('cards');
  };

  const handleAddPlan = (p: any) => {
    setSavingsPlans(prev => [...prev, { ...p, id: crypto.randomUUID(), ledgerId: activeLedgerId }]);
  };

  const handleConfirmAllocation = async (finalAdvice: any) => {
    const updatedPlans = savingsPlans.map(plan => {
      if ((plan as any).ledgerId !== activeLedgerId && (plan as any).ledgerId) return plan;
      const match = finalAdvice.strategic.find((s: any) => s.name === plan.name);
      return match ? { ...plan, currentAmount: (plan.currentAmount || 0) + match.amount } : plan;
    });
    setSavingsPlans(updatedPlans);

    if (user && isReady) {
      await saveUserLedger(user.uid, {
        userEmail: user.email, initialData, transactions, cardDebts, creditCards,
        recurringExpenses, savingsPlans: updatedPlans, incomeCategories, expenseCategories, ledgers, lastUpdated: Date.now()
      });
    }
    setShowAllocationModal(false);
    setPendingAllocation(null);
  };

  const handleUpdateBudget = (category: string, limit: number) => {
    setInitialData(prev => {
      const currentBudgets = prev.categoryBudgets || [];
      const exists = currentBudgets.find(b => b.category === category);
      let newBudgets;
      if (exists) {
        newBudgets = currentBudgets.map(b => b.category === category ? { ...b, limit } : b);
      } else {
        newBudgets = [...currentBudgets, { category, limit }];
      }
      return { ...prev, categoryBudgets: newBudgets };
    });
  };

  const handleUpdatePlan = (id: string, newAmount: number) => {
    setSavingsPlans(prev => prev.map(p => p.id === id ? { ...p, currentAmount: newAmount } : p));
  };

  const handlePayCardInstallment = async (id: string) => {
    let nextTransactions = [...transactions];
    const nextDebts = cardDebts.map(debt => {
      if (debt.id === id && !debt.isPaidThisMonth) {
        const newExp: Transaction = {
          id: crypto.randomUUID(),
          amount: debt.monthlyAmount,
          type: TransactionType.EXPENSE,
          category: '債務',
          note: `還款: ${debt.cardName}`,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: PaymentMethod.CASH,
          accountId: initialData.accounts[0]?.id,
          ledgerId: activeLedgerId
        };
        nextTransactions = [newExp, ...nextTransactions];
        return {
          ...debt,
          installmentCurrent: debt.installmentCurrent + 1,
          remainingAmount: Math.max(0, debt.remainingAmount - debt.monthlyAmount),
          isPaidThisMonth: true
        };
      }
      return debt;
    });
    setTransactions(nextTransactions);
    setCardDebts(nextDebts);
    if (user && isReady) await syncAllToCloud(nextTransactions, nextDebts);
  };

  const handleUpdateDebt = async (updatedDebt: CreditCardDebt) => {
    const newDebts = cardDebts.map(d => (d.id === updatedDebt.id ? updatedDebt : d));
    setCardDebts(newDebts);
    if (user && isReady) await syncAllToCloud(transactions, newDebts);
  };

  // 🚀 帳本管理邏輯
  const handleCreateLedger = () => {
    const name = prompt("請輸入新帳本名稱：");
    if (name) {
      const newLedger = { id: crypto.randomUUID(), name };
      const newLedgers = [...ledgers, newLedger];
      setLedgers(newLedgers);
      setActiveLedgerId(newLedger.id); // 自動切換到新帳本
      setShowLedgerManager(false);
    }
  };

  const handleDeleteLedger = (id: string) => {
    if (ledgers.length <= 1) {
      alert("系統至少需要保留一個帳本！");
      return;
    }
    if (confirm("確定要刪除此帳本嗎？該帳本下的所有資料雖然會保留在資料庫，但將無法直接訪問。")) {
      const newLedgers = ledgers.filter(l => l.id !== id);
      setLedgers(newLedgers);
      if (activeLedgerId === id) {
        setActiveLedgerId(newLedgers[0].id); // 如果刪除的是當前帳本，切換到第一個
      }
    }
  };

  const handleRenameLedger = (id: string, oldName: string) => {
    const newName = prompt("請輸入新的名稱：", oldName);
    if (newName) {
      setLedgers(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l));
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
      </div>
    </div>
  );

  const needsSetup = initialData.accounts.length === 0 || creditCards.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* 授權檢查 */}
      {user && isReady && (() => {
        const now = Date.now();
        const createdAt = initialData.createdAt || now;
        const hasValidPremium = initialData.isPremium && (
          initialData.premiumUntil === null ||
          (initialData.premiumUntil.toMillis ? initialData.premiumUntil.toMillis() : initialData.premiumUntil) > now
        );
        const trialExpiry = createdAt + (30 * 24 * 60 * 60 * 1000);

        if (!hasValidPremium && now > trialExpiry) return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
              <ShieldAlert className="w-8 h-8 text-indigo-600 animate-pulse mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-800 mb-2">服務授權已到期</h2>
              <button onClick={() => logout()} className="w-full text-slate-400 font-bold py-2 text-xs">登出帳戶</button>
            </div>
          </div>
        );
        return null;
      })()}

      <header className="bg-white border-b sticky top-0 z-[100] h-16 px-4 flex items-center shadow-sm">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center gap-2">

          {/* 🌟 左側：Logo 文字 + 帳本切換器融合 */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img src={LOGO_URL} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 object-cover" alt="logo" onError={(e: any) => e.target.src = FALLBACK_LOGO} />
            <div className="hidden xs:flex flex-col leading-none mr-1">
              <h1 className="text-sm font-black text-slate-800">森活科技</h1>
              <span className="text-[9px] font-black text-emerald-600 uppercase">FutureFlow</span>
            </div>

            {/* 帳本切換器 (按鈕化) */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs sm:text-sm font-black text-slate-800 transition-colors shadow-sm border border-slate-200">
                {ledgers.find(l => l.id === activeLedgerId)?.name}
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block z-[200]">
                {ledgers.map(ledger => (
                  <div key={ledger.id} className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${activeLedgerId === ledger.id ? 'bg-indigo-50' : ''}`}>
                    <button onClick={() => setActiveLedgerId(ledger.id)} className={`text-left text-sm font-bold flex-1 ${activeLedgerId === ledger.id ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {ledger.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleRenameLedger(ledger.id, ledger.name); }} className="p-1 text-slate-300 hover:text-indigo-500"><Edit2 size={12} /></button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-slate-100 p-2">
                  <button onClick={() => setShowLedgerManager(true)} className="w-full text-center text-xs font-black text-slate-400 hover:text-indigo-500 py-2 flex items-center justify-center gap-1">
                    <Settings size={12} /> 管理帳本
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 中間：導航 (手機版自動隱藏，桌面版顯示) */}
          <nav className="hidden md:flex bg-slate-100 p-1 rounded-2xl flex-1 max-w-[400px] mx-1 sm:mx-4">
            {[
              { id: 'input', label: '記帳', icon: PlusCircle },
              { id: 'daily', label: '報表', icon: BarChart3 },
              { id: 'savings', label: '目標', icon: Target },
              { id: 'cards', label: '債務', icon: CreditCardIcon },
            ].map((tab) => {
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
                  <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 🌟 右側：工具 */}
          <div className="flex items-center gap-0 sm:gap-1 shrink-0">
            <button onClick={() => setShowCategorySettings(true)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
              <Tags className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Settings className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
            <button onClick={() => { if (window.confirm('確定要登出並結束使用嗎？')) logout(); }} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl ml-1 transition-all">
              <LogOut className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 設定面板 */}
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

        {/* 主功能區 */}
        <div className="animate-in fade-in duration-500 pb-24 sm:pb-8">
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
                {inputSubTab === 'debt' && <div className="p-6"><CreditCardForm onAdd={handleAddDebt} /></div>}
                {inputSubTab === 'recurring' && <div className="p-6"><RecurringForm onAdd={handleAddRecurring} creditCards={creditCards} accounts={initialData.accounts} incomeCategories={incomeCategories} expenseCategories={expenseCategories} /></div>}
              </div>
              <AIAdvisor transactions={displayedTransactions} />
            </div>
          )}

          {activeTab === 'daily' && (
            <div className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
                  {[
                    { id: 'stats', label: '數據顯示' },
                    { id: 'calendar', label: '日曆顯示' },
                    { id: 'forecast', label: '支出預測' }
                  ].map(mode => (
                    <button key={mode.id} onClick={() => setReportMode(mode.id as any)} className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${reportMode === mode.id ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500'}`}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {reportMode === 'stats' && (
                  <div className="space-y-8">
                    <BudgetMonitor transactions={displayedTransactions} budgets={initialData.categoryBudgets || []} />
                    <BalanceSheet transactions={displayedTransactions} cardDebts={displayedDebts} creditCards={creditCards} recurringExpenses={displayedRecurring} savingsPlans={displayedPlans} initialData={initialData} onPayDebt={handlePayCardInstallment} />
                    <BudgetPlanner transactions={displayedTransactions} cardDebts={displayedDebts} creditCards={creditCards} recurringExpenses={displayedRecurring} onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(i => i.id !== id))} onUpdateRecurring={handleUpdateRecurring} />
                    <div className="w-full"><Dashboard transactions={displayedTransactions} cardDebts={displayedDebts} /></div>
                  </div>
                )}
                {reportMode === 'calendar' && (
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                    <div className="lg:col-span-8"><TransactionCalendar transactions={displayedTransactions} onDateClick={(date) => setSelectedDate(date)} /></div>
                    <div className="lg:col-span-4 space-y-4">
                      {/* 右側日曆戰報 */}
                      <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div><h3 className="text-xl font-black text-slate-800">{selectedDate}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Report</p></div>
                          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><CalendarIcon size={20} /></div>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                          {displayedTransactions.filter(t => t.date === selectedDate).length > 0 ? (
                            displayedTransactions.filter(t => t.date === selectedDate).map((t) => (
                              <div key={t.id} className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col gap-3 group hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all duration-300">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${t.type.toLowerCase() === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                      {t.type.toLowerCase() === 'income' ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
                                    </div>
                                    <input type="text" value={t.category} onChange={(e) => handleUpdateTransaction({ ...t, category: e.target.value })} className="bg-transparent text-xs font-black text-slate-700 outline-none w-24 focus:text-indigo-600 border-b border-transparent focus:border-indigo-300 transition-colors" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-xs font-black ${t.type.toLowerCase() === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type.toLowerCase() === 'income' ? '+' : '-'}</span>
                                    <input type="number" value={t.amount} onChange={(e) => handleUpdateTransaction({ ...t, amount: Number(e.target.value) })} className={`w-24 bg-transparent text-sm font-black text-right outline-none focus:text-indigo-600 border-b border-transparent focus:border-indigo-300 transition-colors ${t.type.toLowerCase() === 'income' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                  </div>
                                </div>
                                <div className="flex justify-between items-end pl-11">
                                  <div className="flex flex-col gap-1 flex-1">
                                    <input type="text" value={t.note || ''} placeholder="點擊新增備註..." onChange={(e) => handleUpdateTransaction({ ...t, note: e.target.value })} className="bg-transparent text-[10px] text-slate-400 font-bold outline-none w-full focus:text-slate-600 placeholder:text-slate-300" />
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${t.paymentMethod === PaymentMethod.CREDIT_CARD ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t.paymentMethod === PaymentMethod.CREDIT_CARD ? `信用卡 (${creditCards.find(c => c.id === t.creditCardId)?.name || t.cardName || '未知'})` : `現金 (${initialData.accounts.find(a => a.id === t.accountId)?.name || '帳戶'})`}</span>
                                    </div>
                                  </div>
                                  <button onClick={() => { if (window.confirm('確定要刪除此紀錄嗎？')) setTransactions(prev => prev.filter(x => x.id !== t.id)) }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))
                          ) : <div className="flex flex-col items-center justify-center py-20 text-slate-300"><Sparkles size={24} className="opacity-20 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">本日無戰事</p></div>}
                        </div>
                        {displayedTransactions.filter(t => t.date === selectedDate).length > 0 && (
                          <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">當日淨結算</span>
                              <span className={`text-lg font-black ${displayedTransactions.filter(t => t.date === selectedDate).reduce((sum, t) => t.type.toLowerCase() === 'income' ? sum + Number(t.amount) : sum - Number(t.amount), 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>${displayedTransactions.filter(t => t.date === selectedDate).reduce((sum, t) => t.type.toLowerCase() === 'income' ? sum + Number(t.amount) : sum - Number(t.amount), 0).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {reportMode === 'forecast' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <div><h3 className="text-2xl font-black italic tracking-tighter uppercase">支出預測</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Weekly Expense Outlook</p></div>
                        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl text-right"><p className="text-[9px] text-rose-500 font-black uppercase">未來 8 週總支出預估</p><p className="text-sm font-mono font-black text-white">Payment Required</p></div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 relative z-10">
                        {(() => {
                          const expenseCalendar: Record<string, number> = {};
                          const addExpense = (dateStr: string, amount: number) => { if (!expenseCalendar[dateStr]) expenseCalendar[dateStr] = 0; expenseCalendar[dateStr] += amount; };
                          displayedTransactions.forEach(t => {
                            if (t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD) {
                              const card = creditCards.find(c => c.id === t.creditCardId || c.name === t.cardName);
                              if (card) {
                                const txDate = new Date(t.date);
                                const closingDay = card.closingDay || 10;
                                const paymentDay = card.paymentDay || 25;
                                let payDate = new Date(txDate);
                                if (txDate.getDate() > closingDay) payDate.setMonth(payDate.getMonth() + 1);
                                payDate.setDate(paymentDay);
                                if (paymentDay < closingDay) payDate.setMonth(payDate.getMonth() + 1);
                                if (payDate > new Date()) addExpense(format(payDate, 'yyyy-MM-dd'), Number(t.amount));
                              }
                            }
                          });
                          displayedDebts.forEach(debt => { if (!debt.isPaidThisMonth) { const card = creditCards.find(c => c.name === debt.cardName); const pDay = card?.paymentDay || 25; for (let i = 0; i < 3; i++) { const d = new Date(); d.setMonth(d.getMonth() + i); d.setDate(pDay); if (d > new Date()) addExpense(format(d, 'yyyy-MM-dd'), Number(debt.monthlyAmount)); } } });
                          for (let i = 0; i < 60; i++) { const d = addDays(new Date(), i); const dayNum = d.getDate(); const dateStr = format(d, 'yyyy-MM-dd'); displayedRecurring.forEach(re => { if (re.dayOfMonth === dayNum && re.type.toUpperCase() === 'EXPENSE') addExpense(dateStr, Number(re.amount)); }); }
                          return Array.from({ length: 8 }).map((_, i) => {
                            const weekStart = addDays(new Date(), i * 7); const weekEnd = addDays(weekStart, 6); const weekNum = i + 1;
                            let weeklyTotalExpense = 0; for (let d = 0; d < 7; d++) { const dayStr = format(addDays(weekStart, d), 'yyyy-MM-dd'); if (expenseCalendar[dayStr]) weeklyTotalExpense += expenseCalendar[dayStr]; }
                            return (
                              <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${weeklyTotalExpense > 0 ? 'bg-rose-600/10 border-rose-500/40' : 'bg-white/5 border-white/5 opacity-50'}`}>
                                <div className="flex flex-col gap-1"><div className="flex items-center gap-3"><span className="text-xs font-black text-slate-500">W{weekNum}</span><span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg">{format(weekStart, 'MM/dd')} - {format(weekEnd, 'MM/dd')}</span></div>{weeklyTotalExpense > 0 ? <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter animate-pulse">⚠️ 本週有支出帳單</span> : <span className="text-[9px] font-bold text-slate-500">無預定支出</span>}</div>
                                <div className="text-right"><span className={`text-2xl font-mono font-black ${weeklyTotalExpense > 0 ? 'text-rose-500' : 'text-slate-600'}`}>${weeklyTotalExpense.toLocaleString()}</span><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">需準備現金</p></div>
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

          {activeTab === 'savings' && (
            <SavingsPlanner plans={displayedPlans} transactions={displayedTransactions} accounts={initialData.accounts} onAdd={handleAddPlan} onDelete={(id) => setSavingsPlans(prev => prev.filter(p => p.id !== id))} onUpdatePlan={handleUpdatePlan} onAddTransaction={handleAddTransaction} />
          )}

          {activeTab === 'budget' && (
            <BudgetPlanner transactions={displayedTransactions} cardDebts={displayedDebts} creditCards={creditCards} recurringExpenses={displayedRecurring} onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} onDeleteRecurring={(id) => setRecurringExpenses(prev => prev.filter(i => i.id !== id))} onUpdateRecurring={handleUpdateRecurring} />
          )}

          {activeTab === 'cards' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
              <CreditCardManager debts={displayedDebts} onPayInstallment={handlePayCardInstallment} onDeleteDebt={(id) => setCardDebts(prev => prev.filter(d => d.id !== id))} onUpdateDebt={handleUpdateDebt} />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t px-6 pt-3 pb-8 flex justify-between items-center z-[200] rounded-t-[2rem] shadow-2xl sm:hidden">
        {[
          { id: 'input', label: '記帳', icon: PlusCircle },
          { id: 'daily', label: '報表', icon: BarChart3 },
          { id: 'savings', label: '目標', icon: Target },
          // { id: 'budget', label: '計劃', icon: PieChart }, // 👈 這裡已經被我註解掉，不會顯示
          { id: 'cards', label: '債務', icon: CreditCardIcon }
        ].map((config) => {
          const IconComponent = config.icon;
          return (
            <button key={config.id} onClick={() => setActiveTab(config.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === config.id ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
              <div className={`p-1.5 rounded-xl ${activeTab === config.id ? 'bg-emerald-50' : ''}`}><IconComponent className="w-6 h-6" /></div>
              <span className="text-[10px] font-black">{config.label}</span>
            </button>
          );
        })}
      </nav>

      <AllocationModal isOpen={showAllocationModal} onClose={() => setShowAllocationModal(false)} data={pendingAllocation} onConfirm={handleConfirmAllocation} />

      {showCategorySettings && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 relative">
            <button onClick={() => setShowCategorySettings(false)} className="absolute top-7 right-7"><X className="w-6 h-6 text-slate-400" /></button>
            <h2 className="text-xl font-black mb-8 flex items-center gap-2"><Tags className="text-emerald-500" /> 類別管理中心</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto">
              <CategoryList title="收入來源" categories={incomeCategories} setCategories={setIncomeCategories} color="emerald" />
              <CategoryList title="支出項目" categories={expenseCategories} setCategories={setExpenseCategories} color="rose" budgets={initialData.categoryBudgets} onUpdateBudget={handleUpdateBudget} />
            </div>
            <button onClick={() => setShowCategorySettings(false)} className="w-full mt-8 bg-slate-900 text-white font-black py-4.5 rounded-2xl">完成變更</button>
          </div>
        </div>
      )}

      {/* 🚀 帳本管理彈窗 (新增功能) */}
      {showLedgerManager && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 relative shadow-2xl">
            <button onClick={() => setShowLedgerManager(false)} className="absolute top-6 right-6"><X className="w-6 h-6 text-slate-400 hover:text-slate-800" /></button>
            <h2 className="text-xl font-black mb-6 text-slate-800 flex items-center gap-2"><Settings className="text-indigo-500" /> 帳本管理中心</h2>

            <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto">
              {ledgers.map(l => (
                <div key={l.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-bold text-slate-700">{l.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRenameLedger(l.id, l.name)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm"><Edit2 size={16} /></button>
                    {/* 至少保留一個帳本 */}
                    {ledgers.length > 1 && (
                      <button onClick={() => handleDeleteLedger(l.id)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-rose-600 shadow-sm"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleCreateLedger} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl">
              <Plus size={20} /> 建立新帳本
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// 輔助組件 (保持不變)
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
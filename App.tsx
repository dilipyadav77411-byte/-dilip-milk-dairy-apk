import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Home,
  Calculator,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { ActiveScreen, DairyDatabase } from './types';
import { getDatabase, subscribeToDatabase, saveDatabase, initStorageAsync, defaultSettings } from './storage/db';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';

// Fast Dynamic Imports: Non-home screens load on demand so the home screen loads in 0.1s
const MilkSalesModule = lazy(() => import('./components/MilkSalesModule').then((m) => ({ default: m.MilkSalesModule })));
const MilkPurchaseModule = lazy(() => import('./components/MilkPurchaseModule').then((m) => ({ default: m.MilkPurchaseModule })));
const CustomerManagement = lazy(() => import('./components/CustomerManagement').then((m) => ({ default: m.CustomerManagement })));
const SupplierManagement = lazy(() => import('./components/SupplierManagement').then((m) => ({ default: m.SupplierManagement })));
const CustomerLedger = lazy(() => import('./components/CustomerLedger').then((m) => ({ default: m.CustomerLedger })));
const SupplierLedger = lazy(() => import('./components/SupplierLedger').then((m) => ({ default: m.SupplierLedger })));
const FinalHisabModule = lazy(() => import('./components/FinalHisabModule').then((m) => ({ default: m.FinalHisabModule })));
const PendingDuesReport = lazy(() => import('./components/PendingDuesReport').then((m) => ({ default: m.PendingDuesReport })));
const PaymentModule = lazy(() => import('./components/PaymentModule').then((m) => ({ default: m.PaymentModule })));
const TodaySummary = lazy(() => import('./components/TodaySummary').then((m) => ({ default: m.TodaySummary })));
const MonthlyReport = lazy(() => import('./components/MonthlyReport').then((m) => ({ default: m.MonthlyReport })));
const BackupRestoreModule = lazy(() => import('./components/BackupRestoreModule').then((m) => ({ default: m.BackupRestoreModule })));
const SettingsModule = lazy(() => import('./components/SettingsModule').then((m) => ({ default: m.SettingsModule })));
const ApkGuideModal = lazy(() => import('./components/ApkGuideModal').then((m) => ({ default: m.ApkGuideModal })));
const PinLockModal = lazy(() => import('./components/PinLockModal').then((m) => ({ default: m.PinLockModal })));
const DailyMilkQuantityModule = lazy(() => import('./components/DailyMilkQuantityModule').then((m) => ({ default: m.DailyMilkQuantityModule })));
const DailyExpenseModule = lazy(() => import('./components/DailyExpenseModule').then((m) => ({ default: m.DailyExpenseModule })));
const DateWisePaymentReport = lazy(() => import('./components/DateWisePaymentReport').then((m) => ({ default: m.DateWisePaymentReport })));
const AllReportsModule = lazy(() => import('./components/AllReportsModule').then((m) => ({ default: m.AllReportsModule })));
const CustomerPaymentHistory = lazy(() => import('./components/CustomerPaymentHistory').then((m) => ({ default: m.CustomerPaymentHistory })));
const SupplierPaymentHistory = lazy(() => import('./components/SupplierPaymentHistory').then((m) => ({ default: m.SupplierPaymentHistory })));
const PaymentDateLockModal = lazy(() => import('./components/PaymentDateLockModal').then((m) => ({ default: m.PaymentDateLockModal })));
const LockedPaymentsReport = lazy(() => import('./components/LockedPaymentsReport').then((m) => ({ default: m.LockedPaymentsReport })));
const CalculatorModal = lazy(() => import('./components/CalculatorModal').then((m) => ({ default: m.CalculatorModal })));
const CodeViewerModule = lazy(() => import('./components/CodeViewerModule').then((m) => ({ default: m.CodeViewerModule })));

const ScreenLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
    <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2.5"></div>
    <span className="text-xs font-bold text-slate-700">पेज लोड हो रहा है...</span>
  </div>
);

export default function App() {
  const [db, setDb] = useState<DairyDatabase>(() => getDatabase());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
  const [showApkGuide, setShowApkGuide] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
  const [dataRefreshKey, setDataRefreshKey] = useState<number>(0);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const current = getDatabase();
      return Boolean(current?.settings?.pinLockEnabled);
    } catch {
      return false;
    }
  });

  // Date Lock Payment Modal state
  const [isPaymentDateLockModalOpen, setIsPaymentDateLockModalOpen] = useState<boolean>(false);
  const [paymentDateLockType, setPaymentDateLockType] = useState<'customer' | 'supplier'>('customer');
  const [paymentDateLockPartyId, setPaymentDateLockPartyId] = useState<string | undefined>(undefined);
  const [paymentDateLockFromDate, setPaymentDateLockFromDate] = useState<string | undefined>(undefined);
  const [paymentDateLockToDate, setPaymentDateLockToDate] = useState<string | undefined>(undefined);

  const handleOpenPaymentModal = (
    type: 'customer' | 'supplier' = 'customer',
    partyId?: string,
    fromDate?: string,
    toDate?: string
  ) => {
    setPaymentDateLockType(type);
    setPaymentDateLockPartyId(partyId);
    setPaymentDateLockFromDate(fromDate);
    setPaymentDateLockToDate(toDate);
    setIsPaymentDateLockModalOpen(true);
  };

  useEffect(() => {
    // Run async vault recovery & request persistent browser storage
    initStorageAsync().then((syncedDb) => {
      setDb({ ...syncedDb });
    });

    const unsubscribe = subscribeToDatabase((updatedDb) => {
      setDb({ ...updatedDb });
    });
    return () => unsubscribe();
  }, []);

  const handleRefreshAllData = async () => {
    if (isRefreshingData) return;
    setIsRefreshingData(true);
    try {
      const syncedDb = await initStorageAsync();
      const latestDb = getDatabase();
      const freshDb = syncedDb || latestDb;
      setDb({
        ...freshDb,
        customers: [...freshDb.customers],
        suppliers: [...freshDb.suppliers],
        salesEntries: [...freshDb.salesEntries],
        purchaseEntries: [...freshDb.purchaseEntries],
        customerPayments: [...freshDb.customerPayments],
        supplierPayments: [...freshDb.supplierPayments],
        dailyExpenses: [...(freshDb.dailyExpenses || [])],
        settings: { ...freshDb.settings },
      });
      setDataRefreshKey((k) => k + 1);
      setRefreshToast('✓ पूरा डेटा सफलतापूर्वक रिफ्रेश हो गया!');
      window.setTimeout(() => setRefreshToast(null), 2400);
    } catch {
      const fallbackDb = getDatabase();
      setDb({ ...fallbackDb });
      setDataRefreshKey((k) => k + 1);
      setRefreshToast('✓ डेटा रिफ्रेश हो गया!');
      window.setTimeout(() => setRefreshToast(null), 2400);
    } finally {
      window.setTimeout(() => setIsRefreshingData(false), 450);
    }
  };

  // Customer navigation helpers
  const handleGoToCustomerLedger = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setActiveScreen('customer_ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToSupplierLedger = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setActiveScreen('supplier_ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [paymentPeriodStart, setPaymentPeriodStart] = useState<string | undefined>(undefined);
  const [paymentPeriodEnd, setPaymentPeriodEnd] = useState<string | undefined>(undefined);

  const handleQuickCustomerPayment = (customerId: string, periodStart?: string, periodEnd?: string) => {
    setSelectedCustomerId(customerId);
    setSelectedSupplierId(undefined);
    setPaymentPeriodStart(periodStart);
    setPaymentPeriodEnd(periodEnd);
    handleOpenPaymentModal('customer', customerId, periodStart, periodEnd);
  };

  const handleQuickSupplierPayment = (supplierId: string, periodStart?: string, periodEnd?: string) => {
    setSelectedSupplierId(supplierId);
    setSelectedCustomerId(undefined);
    setPaymentPeriodStart(periodStart);
    setPaymentPeriodEnd(periodEnd);
    handleOpenPaymentModal('supplier', supplierId, periodStart, periodEnd);
  };

  const handleEmergencyUnlock = () => {
    const updated = {
      ...db,
      settings: {
        ...db.settings,
        pinLockEnabled: false,
      },
    };
    saveDatabase(updated);
    setIsLocked(false);
  };

  // If app is PIN-locked
  if (isLocked) {
    return (
      <Suspense fallback={<ScreenLoadingFallback />}>
        <PinLockModal
          settings={db?.settings || defaultSettings}
          onUnlock={() => setIsLocked(false)}
          onDisableLockEmergency={handleEmergencyUnlock}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-100 flex flex-col font-sans selection:bg-blue-200">
      {/* Sticky Top Header */}
      <Header
        settings={db?.settings || defaultSettings}
        activeScreen={activeScreen}
        setActiveScreen={(screen) => {
          setActiveScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLockApp={() => setIsLocked(true)}
        onOpenApkGuide={() => setShowApkGuide(true)}
        onOpenCalculator={() => setShowCalculator(true)}
      />

      {/* Main Content Area */}
      <main key={dataRefreshKey} className="flex-1 px-3 sm:px-4 py-4 max-w-5xl w-full mx-auto pb-24">
        <Suspense fallback={<ScreenLoadingFallback />}>
        {activeScreen === 'home' && (
          <HomeDashboard
            db={db}
            setActiveScreen={(screen) => {
              setActiveScreen(screen);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenApkGuide={() => setShowApkGuide(true)}
            onOpenPaymentModal={handleOpenPaymentModal}
            onGoToLockedPayments={() => {
              setActiveScreen('locked_payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'sales' && (
          <MilkSalesModule
            db={db}
            onGoToCustomerLedger={handleGoToCustomerLedger}
            onGoToPurchase={() => {
              setActiveScreen('purchase');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'daily_milk_quantity' && (
          <DailyMilkQuantityModule
            db={db}
            onGoToSales={() => {
              setActiveScreen('sales');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToPurchase={() => {
              setActiveScreen('purchase');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToAddCustomer={() => {
              setActiveScreen('add_customer');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToAddSupplier={() => {
              setActiveScreen('add_supplier');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToCustomerLedger={handleGoToCustomerLedger}
            onGoToSupplierLedger={handleGoToSupplierLedger}
          />
        )}

        {activeScreen === 'daily_expense' && (
          <DailyExpenseModule
            db={db}
            onGoToHome={() => {
              setActiveScreen('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'purchase' && (
          <MilkPurchaseModule
            db={db}
            onGoToSupplierLedger={handleGoToSupplierLedger}
            onGoToSales={() => {
              setActiveScreen('sales');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'add_customer' && (
          <CustomerManagement
            db={db}
            onSelectCustomerLedger={handleGoToCustomerLedger}
            onQuickPayment={handleQuickCustomerPayment}
          />
        )}

        {activeScreen === 'add_supplier' && (
          <SupplierManagement
            db={db}
            onSelectSupplierLedger={handleGoToSupplierLedger}
            onQuickPayment={handleQuickSupplierPayment}
          />
        )}

        {activeScreen === 'customer_ledger' && (
          <CustomerLedger
            db={db}
            initialCustomerId={selectedCustomerId}
            onRecordPayment={handleQuickCustomerPayment}
          />
        )}

        {activeScreen === 'supplier_ledger' && (
          <SupplierLedger
            db={db}
            initialSupplierId={selectedSupplierId}
            onRecordPayment={handleQuickSupplierPayment}
          />
        )}

        {activeScreen === 'final_hisab' && (
          <FinalHisabModule
            db={db}
            onSelectCustomerLedger={handleGoToCustomerLedger}
            onSelectSupplierLedger={handleGoToSupplierLedger}
            onQuickCustomerPayment={handleQuickCustomerPayment}
            onQuickSupplierPayment={handleQuickSupplierPayment}
            onGoToDateWisePaymentReport={() => {
              setActiveScreen('datewise_payment_report');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToLockedPayments={() => {
              setActiveScreen('locked_payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'pending_dues_report' && (
          <PendingDuesReport
            db={db}
            onSelectCustomerLedger={handleGoToCustomerLedger}
            onSelectSupplierLedger={handleGoToSupplierLedger}
            onQuickCustomerPayment={handleQuickCustomerPayment}
            onQuickSupplierPayment={handleQuickSupplierPayment}
            onGoToDateWisePaymentReport={() => {
              setActiveScreen('datewise_payment_report');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToLockedPayments={() => {
              setActiveScreen('locked_payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'datewise_payment_report' && (
          <DateWisePaymentReport
            db={db}
            onGoToPayments={() => {
              setActiveScreen('payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToCustomerLedger={handleGoToCustomerLedger}
            onGoToSupplierLedger={handleGoToSupplierLedger}
          />
        )}

        {activeScreen === 'locked_payments' && (
          <LockedPaymentsReport
            db={db}
            onGoToHome={() => {
              setActiveScreen('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToPayments={() => {
              handleOpenPaymentModal('customer');
            }}
            onGoToCustomerLedger={handleGoToCustomerLedger}
            onGoToSupplierLedger={handleGoToSupplierLedger}
          />
        )}

        {activeScreen === 'all_reports' && (
          <AllReportsModule
            db={db}
            onSelectCustomerLedger={handleGoToCustomerLedger}
            onSelectSupplierLedger={handleGoToSupplierLedger}
            onQuickCustomerPayment={handleQuickCustomerPayment}
            onQuickSupplierPayment={handleQuickSupplierPayment}
            onGoToCustomerHistory={() => {
              setActiveScreen('customer_payment_history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToSupplierHistory={() => {
              setActiveScreen('supplier_payment_history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToLockedPayments={() => {
              setActiveScreen('locked_payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'customer_payment_history' && (
          <CustomerPaymentHistory
            db={db}
            onGoToPayments={() => {
              setActiveScreen('payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCustomerLedger={handleGoToCustomerLedger}
          />
        )}

        {activeScreen === 'supplier_payment_history' && (
          <SupplierPaymentHistory
            db={db}
            onGoToPayments={() => {
              setActiveScreen('payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectSupplierLedger={handleGoToSupplierLedger}
          />
        )}

        {activeScreen === 'payments' && (
          <PaymentModule
            db={db}
            initialCustomerId={selectedCustomerId}
            initialSupplierId={selectedSupplierId}
            initialPeriodStart={paymentPeriodStart}
            initialPeriodEnd={paymentPeriodEnd}
            onOpenPaymentModal={handleOpenPaymentModal}
            onGoToLockedPayments={() => {
              setActiveScreen('locked_payments');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToDateWisePaymentReport={() => {
              setActiveScreen('datewise_payment_report');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToCustomerHistory={() => {
              setActiveScreen('customer_payment_history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToSupplierHistory={() => {
              setActiveScreen('supplier_payment_history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToAllReports={() => {
              setActiveScreen('all_reports');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'today_summary' && (
          <TodaySummary
            db={db}
            onGoToPurchase={() => {
              setActiveScreen('purchase');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onGoToSales={() => {
              setActiveScreen('sales');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'monthly_report' && <MonthlyReport db={db} />}

        {activeScreen === 'backup_restore' && (
          <BackupRestoreModule
            db={db}
            onGoToSettings={() => {
              setActiveScreen('settings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsModule
            db={db}
            onOpenApkGuide={() => setShowApkGuide(true)}
            onGoToBackup={() => {
              setActiveScreen('backup_restore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenCodeViewer={() => {
              setActiveScreen('code_viewer');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeScreen === 'code_viewer' && <CodeViewerModule />}
        </Suspense>
      </main>

      {/* Refresh Success Toast */}
      {refreshToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-4 py-2 rounded-2xl shadow-xl border border-emerald-400/50 flex items-center gap-2 text-xs sm:text-sm font-black whitespace-nowrap no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{refreshToast}</span>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar — Home Page & Refresh Data */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-lg px-3 py-1.5 no-print">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveScreen('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex items-center justify-center gap-2 py-2 px-5 rounded-xl transition active:scale-95 whitespace-nowrap ${
              activeScreen === 'home'
                ? 'text-blue-700 bg-blue-50 border border-blue-200 font-black'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md font-black'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-sm">होम पेज</span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAllData}
            disabled={isRefreshingData}
            className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-black transition active:scale-95 disabled:opacity-75 whitespace-nowrap"
            title="पूरा डेटा एक बार रिफ्रेश करें"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isRefreshingData ? 'animate-spin' : ''}`} />
            <span className="text-sm">{isRefreshingData ? 'रिफ्रेश हो रहा...' : 'रिफ्रेश'}</span>
          </button>
        </div>
      </nav>

      {/* Payment Date-Lock Interactive Popup Modal */}
      {isPaymentDateLockModalOpen && (
        <Suspense fallback={null}>
          <PaymentDateLockModal
            isOpen={isPaymentDateLockModalOpen}
            onClose={() => setIsPaymentDateLockModalOpen(false)}
            db={db}
            defaultType={paymentDateLockType}
            initialPartyId={paymentDateLockPartyId}
            initialFromDate={paymentDateLockFromDate}
            initialToDate={paymentDateLockToDate}
          />
        </Suspense>
      )}

      {/* Floating Quick Calculator Button (Accessible on every page) */}
      {!showCalculator && (
        <button
          type="button"
          onClick={() => setShowCalculator(true)}
          className="fixed bottom-16 right-3 sm:bottom-20 sm:right-5 z-40 flex items-center gap-1.5 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-600 hover:to-blue-600 text-white font-black px-3.5 py-2.5 rounded-2xl shadow-xl border-2 border-amber-300/80 transition transform active:scale-95 text-xs no-print"
          title="किसी भी पेज पर तुरंत कैलकुलेटर खोलें"
        >
          <Calculator className="w-4 h-4 text-amber-300 shrink-0" />
          <span>कैलकुलेटर</span>
        </button>
      )}

      {/* APK Guide Modal */}
      {showApkGuide && (
        <Suspense fallback={null}>
          <ApkGuideModal onClose={() => setShowApkGuide(false)} />
        </Suspense>
      )}

      {/* Global Calculator Modal */}
      {showCalculator && (
        <Suspense fallback={null}>
          <CalculatorModal
            onClose={() => setShowCalculator(false)}
            defaultCowRate={db?.settings?.defaultCowSaleRate}
            defaultBuffaloRate={db?.settings?.defaultBuffaloSaleRate}
          />
        </Suspense>
      )}
    </div>
  );
}

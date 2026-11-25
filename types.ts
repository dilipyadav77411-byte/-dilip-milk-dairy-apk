export type ShiftType = 'morning' | 'evening';
export type MilkType = 'cow' | 'buffalo';
export type MilkPreference = 'cow' | 'buffalo' | 'both';
export type PaymentMethod = 'cash' | 'upi' | 'other';

export interface Customer {
  id: string;
  customerCode: string; // e.g. "C-101"
  name: string;
  mobile: string;
  address: string;
  cowRate: number;
  buffaloRate: number;
  milkPreference?: MilkPreference; // ग्राहक कौन सा दूध लेगा: 'cow' (गाय), 'buffalo' (भैंस), या 'both' (दोनों)
  openingBalance: number; // positive = customer owes money, negative = advance
  notes: string;
  isBlocked?: boolean; // ग्राहक ब्लॉक स्थिति (ब्लॉक होने पर नई बिक्री व पेमेंट एंट्री में नहीं दिखेगा)
  blockedAt?: string;
  isLocked?: boolean; // ग्राहक लॉक स्थिति (बैकवर्ड कम्पैटिबिलिटी)
  lockedAt?: string;
  sortOrder?: number; // कस्टम क्रम (दूध एंट्री व लिस्ट में अपने हिसाब से क्रम सेट करने के लिए)
  createdAt: string;
}

export interface Supplier {
  id: string;
  supplierCode: string; // e.g. "S-101"
  name: string;
  mobile: string;
  address: string;
  cowRate: number;
  buffaloRate: number;
  milkPreference?: MilkPreference; // सप्लायर कौन सा दूध देगा: 'cow' (गाय), 'buffalo' (भैंस), या 'both' (दोनों)
  openingBalance: number; // positive = dairy owes supplier
  notes: string;
  isBlocked?: boolean; // सप्लायर ब्लॉक स्थिति (ब्लॉक होने पर नई खरीद व पेमेंट एंट्री में नहीं दिखेगा)
  blockedAt?: string;
  isLocked?: boolean; // सप्लायर लॉक स्थिति (बैकवर्ड कम्पैटिबिलिटी)
  lockedAt?: string;
  sortOrder?: number; // कस्टम क्रम (दूध आवक व लिस्ट में अपने हिसाब से क्रम सेट करने के लिए)
  createdAt: string;
}

/**
 * चेक करें कि ग्राहक या सप्लायर ब्लॉक है या नहीं
 */
export function isPartyBlocked(party?: { isBlocked?: boolean; isLocked?: boolean } | null): boolean {
  if (!party) return false;
  return Boolean(party.isBlocked || party.isLocked);
}

/**
 * ग्राहक/सप्लायर की दूध पसंद प्राप्त करें (पुराने रिकॉर्ड के लिए डिफ़ॉल्ट 'both')
 */
export function getPartyMilkPreference(party?: { milkPreference?: MilkPreference } | null): MilkPreference {
  if (party?.milkPreference === 'cow' || party?.milkPreference === 'buffalo' || party?.milkPreference === 'both') {
    return party.milkPreference;
  }
  return 'both';
}

export function partyAllowsCow(party?: { milkPreference?: MilkPreference } | null): boolean {
  const pref = getPartyMilkPreference(party);
  return pref === 'cow' || pref === 'both';
}

export function partyAllowsBuffalo(party?: { milkPreference?: MilkPreference } | null): boolean {
  const pref = getPartyMilkPreference(party);
  return pref === 'buffalo' || pref === 'both';
}

export function getPartyDefaultMilkType(party?: { milkPreference?: MilkPreference } | null): MilkType {
  return getPartyMilkPreference(party) === 'cow' ? 'cow' : 'buffalo';
}


export interface MilkSaleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  customerId: string;
  customerName: string;
  milkType: MilkType;
  quantity: number; // in Litres
  rate: number; // snapshot rate per Litre
  totalAmount: number;
  noMilkTaken: boolean; // "दूध नहीं लिया"
  paidAmount?: number; // immediate cash received from customer
  balanceDue?: number; // balance due for this sale entry
  notes?: string;
  createdAt: string;
}

export interface MilkPurchaseEntry {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  supplierId: string;
  supplierName: string;
  milkType: MilkType;
  quantity: number; // in Litres
  rate: number; // purchase rate snapshot
  totalAmount: number;
  paidAmount: number; // paid immediately
  balanceDue: number; // remaining payable
  noMilkGiven?: boolean; // "दूध नहीं दिया / नहीं आया"
  notes?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  date: string; // YYYY-MM-DD (भुगतान रिकॉर्ड तारीख)
  customerId: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  periodStartDate?: string; // हिसाब अवधि कब से (YYYY-MM-DD)
  periodEndDate?: string;   // हिसाब अवधि कब तक (YYYY-MM-DD)
  isLockedPeriod?: boolean; // क्या यह अवधि पूर्ण चुकता और लॉक है
  settledStatus?: 'full' | 'partial' | 'unpaid'; // पूर्ण चुकता / आंशिक भुगतान / अदत्त
  periodMilkQty?: number;   // अवधि का कुल दूध
  periodBillAmount?: number; // अवधि का कुल बिल
  remainingPeriodDue?: number; // अवधि की बाकी रकम
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  date: string; // YYYY-MM-DD (भुगतान रिकॉर्ड तारीख)
  supplierId: string;
  supplierName: string;
  amount: number;
  method: PaymentMethod;
  periodStartDate?: string; // हिसाब अवधि कब से (YYYY-MM-DD)
  periodEndDate?: string;   // हिसाब अवधि कब तक (YYYY-MM-DD)
  isLockedPeriod?: boolean; // क्या यह अवधि पूर्ण चुकता और लॉक है
  settledStatus?: 'full' | 'partial' | 'unpaid'; // पूर्ण चुकता / आंशिक भुगतान / अदत्त
  periodMilkQty?: number;   // अवधि का कुल दूध
  periodBillAmount?: number; // अवधि का कुल बिल
  remainingPeriodDue?: number; // अवधि की बाकी रकम
  notes?: string;
  createdAt: string;
}

export interface AutoBackupRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: string;
  customersCount: number;
  suppliersCount: number;
  salesCount: number;
  purchaseCount: number;
  filename: string;
  dataJson: string;
}

export interface AppSettings {
  businessName: string;
  ownerName: string;
  mobile: string;
  address: string;
  defaultCowSaleRate: number;
  defaultBuffaloSaleRate: number;
  defaultCowPurchaseRate: number;
  defaultBuffaloPurchaseRate: number;
  pinLockEnabled: boolean;
  pinCode: string;
  backupAutoReminder: boolean;
  autoBackupEnabled: boolean; // डेली ऑटो बैकअप चालू/बंद
  autoBackupTime: string; // डिफ़ॉल्ट '23:00' (रात 11:00 बजे)
  lastAutoBackupDate?: string; // e.g. '2026-10-26'
  lastAutoBackupTime?: string; // e.g. '11:00 PM'
  hideSettledPaymentsEverywhere?: boolean; // डेट-वाइज चुकता पेमेंट रिपोर्ट अन्य पेजों से छुपाएं (केवल समर्पित पेज पर दिखे)
  homeMenuOrder?: string[]; // होम पेज के सभी मेनू का कस्टम क्रम (ऊपर-नीचे, दाएं-बाएं सेट करने के लिए)
}

export interface DailyExpense {
  id: string;
  date: string; // YYYY-MM-DD
  itemName: string; // सामान का नाम (मैन्युअल टाइपिंग)
  quantity: string; // मात्रा (मैन्युअल टाइपिंग: उदा. 2 बोरी, 10 ली, 50 किलो)
  amount: number; // कितने रुपए का है (कुल खर्च राशि ₹)
  notes?: string;
  createdAt: string;
}

export interface DairyDatabase {
  customers: Customer[];
  suppliers: Supplier[];
  salesEntries: MilkSaleEntry[];
  purchaseEntries: MilkPurchaseEntry[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  dailyExpenses?: DailyExpense[];
  settings: AppSettings;
  version: number;
  lastBackupDate?: string;
}

export type ActiveScreen =
  | 'home'
  | 'sales'
  | 'purchase'
  | 'daily_milk_quantity'
  | 'daily_expense'
  | 'add_customer'
  | 'add_supplier'
  | 'customer_ledger'
  | 'supplier_ledger'
  | 'final_hisab'
  | 'pending_dues_report'
  | 'datewise_payment_report'
  | 'locked_payments'
  | 'all_reports'
  | 'customer_payment_history'
  | 'supplier_payment_history'
  | 'payments'
  | 'today_summary'
  | 'monthly_report'
  | 'backup_restore'
  | 'settings'
  | 'apk_guide'
  | 'code_viewer';


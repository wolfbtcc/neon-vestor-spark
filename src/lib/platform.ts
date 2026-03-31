export function formatBRL(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function generateReferralCode(): string {
  return 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generatePixCode(): string {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('').toUpperCase();
}

export function generateWalletAddress(): string {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneCountry: string;
  password: string;
  balance: number;
  invested: number;
  profits: number;
  referralCode: string;
  referredBy: string | null;
  createdAt: number;
  isAdmin?: boolean;
}

export interface Investment {
  id: string;
  userId: string;
  amount: number;
  cycleNumber: number;
  durationDays: number;
  returnPercent: number;
  startDate: number;
  endDate: number;
  status: 'active' | 'completed' | 'withdrawn';
  profit: number;
  lastYieldAt?: number;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  method: 'pix' | 'usdt';
  status: 'pending' | 'confirmed';
  pixCode?: string;
  walletAddress?: string;
  createdAt: number;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  walletName: string;
  walletAddress: string;
  // Legacy fields for backwards compatibility
  pixName?: string;
  pixKey?: string;
  type: 'profits' | 'commission' | 'pool';
  status: 'pending' | 'completed';
  createdAt: number;
}

export interface Commission {
  id: string;
  userId: string;
  fromUserId: string;
  fromUserName: string;
  level: number;
  amount: number;
  createdAt: number;
}

export const CYCLES = [
  { days: 1, returnPercent: 1.5, label: '1 dia', name: 'Vortex Flash' },
  { days: 7, returnPercent: 5, label: '7 dias', name: 'Vortex Pulse' },
  { days: 15, returnPercent: 10, label: '15 dias', name: 'Vortex Flow' },
  { days: 30, returnPercent: 200, label: '30 dias', name: 'Vortex Prime' },
  { days: 60, returnPercent: 300, label: '60 dias', name: 'Vortex Omega' },
];

export interface ProfitEntry {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  platformFee?: number;
  net: number;
  investmentId: string;
  createdAt: number;
}

export const COMMISSION_LEVELS = [15, 10, 2, 1, 1];

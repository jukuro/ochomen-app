export const POINTS_STORAGE_KEY = "ochomen_points_wallet";

export const POINTS_PER_SCAN = 5;

export type ShopCategory = "consumable" | "limited" | "memory";

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  description: string;
  category: ShopCategory;
  /** 何度でも交換可能（消耗品） */
  repeatable?: boolean;
}

export interface PointsWallet {
  balance: number;
  redeemedIds: string[];
  totalEarned: number;
  /** 交換済みアイテムの所持数 */
  inventory?: Record<string, number>;
}

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  consumable: "消耗品",
  limited: "限定",
  memory: "思い出",
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "shredder-ticket",
    name: "シュレッダー券",
    emoji: "🗑️",
    cost: 50,
    description: "紙を片付けた証。何度でも交換OK",
    category: "consumable",
    repeatable: true,
  },
  {
    id: "refill-pack",
    name: "リフィルパック",
    emoji: "📎",
    cost: 80,
    description: "お帳面リフィル風デジタル特典",
    category: "consumable",
    repeatable: true,
  },
  {
    id: "notebook-refill",
    name: "手帳リフィル",
    emoji: "📓",
    cost: 60,
    description: "連絡帳リフィル風ステッカー",
    category: "consumable",
    repeatable: true,
  },
  {
    id: "file-folder",
    name: "ファイルボックス",
    emoji: "📁",
    cost: 120,
    description: "おたより整理セット（デジタル特典）",
    category: "limited",
  },
  {
    id: "storage-box",
    name: "書類収納ボックス",
    emoji: "🗄️",
    cost: 150,
    description: "プリント整理のデジタル特典",
    category: "limited",
  },
  {
    id: "album-ticket",
    name: "アルバム券",
    emoji: "🖼️",
    cost: 180,
    description: "思い出アルバム用フレーム",
    category: "memory",
    repeatable: true,
  },
  {
    id: "premium-sample",
    name: "デジタルブック試読",
    emoji: "📖",
    cost: 200,
    description: "月次思い出ブックのプレビュー",
    category: "memory",
  },
];

const DEFAULT_WALLET: PointsWallet = {
  balance: 0,
  redeemedIds: [],
  totalEarned: 0,
  inventory: {},
};

export function loadPointsWallet(): PointsWallet {
  try {
    const raw = localStorage.getItem(POINTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WALLET, inventory: {} };
    const parsed = JSON.parse(raw) as Partial<PointsWallet>;
    return {
      balance: parsed.balance ?? 0,
      redeemedIds: Array.isArray(parsed.redeemedIds) ? parsed.redeemedIds : [],
      totalEarned: parsed.totalEarned ?? parsed.balance ?? 0,
      inventory:
        parsed.inventory && typeof parsed.inventory === "object"
          ? parsed.inventory
          : {},
    };
  } catch {
    return { ...DEFAULT_WALLET, inventory: {} };
  }
}

export function savePointsWallet(wallet: PointsWallet): void {
  try {
    localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(wallet));
  } catch (err) {
    console.warn("[localStorage] save points failed:", err);
  }
}

export function getInventoryCount(wallet: PointsWallet, itemId: string): number {
  return wallet.inventory?.[itemId] ?? 0;
}

export interface PointsAwardResult {
  wallet: PointsWallet;
  pointsGained: number;
}

export function addScanPoints(prev: PointsWallet, scanCount = 1): PointsAwardResult {
  const pointsGained = POINTS_PER_SCAN * scanCount;
  const wallet: PointsWallet = {
    ...prev,
    balance: prev.balance + pointsGained,
    totalEarned: prev.totalEarned + pointsGained,
    inventory: prev.inventory ?? {},
  };
  savePointsWallet(wallet);
  return { wallet, pointsGained };
}

export type RedeemResult =
  | { ok: true; wallet: PointsWallet; item: ShopItem }
  | { ok: false; reason: "insufficient" | "already" };

export function redeemShopItem(wallet: PointsWallet, itemId: string): RedeemResult {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "already" };

  const alreadyOwned = wallet.redeemedIds.includes(itemId);
  if (!item.repeatable && alreadyOwned) {
    return { ok: false, reason: "already" };
  }
  if (wallet.balance < item.cost) {
    return { ok: false, reason: "insufficient" };
  }

  const inventory = { ...(wallet.inventory ?? {}) };
  inventory[itemId] = (inventory[itemId] ?? 0) + 1;

  const next: PointsWallet = {
    ...wallet,
    balance: wallet.balance - item.cost,
    redeemedIds: item.repeatable ? wallet.redeemedIds : [...wallet.redeemedIds, itemId],
    inventory,
  };
  savePointsWallet(next);
  return { ok: true, wallet: next, item };
}

export function mergePointsWallet(local: PointsWallet, remote?: PointsWallet): PointsWallet {
  if (!remote) return local;
  const inventory: Record<string, number> = { ...(local.inventory ?? {}) };
  for (const [id, count] of Object.entries(remote.inventory ?? {})) {
    inventory[id] = Math.max(inventory[id] ?? 0, count);
  }
  return {
    balance: Math.max(local.balance, remote.balance),
    totalEarned: Math.max(local.totalEarned, remote.totalEarned),
    redeemedIds: [...new Set([...local.redeemedIds, ...remote.redeemedIds])],
    inventory,
  };
}

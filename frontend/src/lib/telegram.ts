// Telegram Web App SDK helpers
// The SDK is loaded via script tag in layout.tsx
// Docs: https://core.telegram.org/bots/webapps

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  platform: string;
  version: string;
  isVersionAtLeast: (version: string) => boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  disableVerticalSwipes: () => void;
  enableVerticalSwipes: () => void;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  isFullscreen: boolean;
  shareToStory: (mediaUrl: string, params?: { text?: string; widget_link?: { url: string; name?: string } }) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    setText: (text: string) => void;
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  CloudStorage: {
    setItem: (key: string, value: string, callback?: (error: any, success: boolean) => void) => void;
    getItem: (key: string, callback: (error: any, value: string) => void) => void;
    getItems: (keys: string[], callback: (error: any, values: Record<string, string>) => void) => void;
    removeItem: (key: string, callback?: (error: any, success: boolean) => void) => void;
    getKeys: (callback: (error: any, keys: string[]) => void) => void;
  };
};

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp ?? null;
}

// Shorthand
const tg = () => getTelegramWebApp();

// --- Haptic ---
export function haptic(type: "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection") {
  try {
    const w = tg();
    if (!w) return;
    if (type === "selection") w.HapticFeedback.selectionChanged();
    else if (type === "success" || type === "error" || type === "warning") w.HapticFeedback.notificationOccurred(type);
    else w.HapticFeedback.impactOccurred(type);
  } catch {}
}

// --- Theme ---
export function setHeaderColor(color: string) {
  try { tg()?.setHeaderColor(color); } catch {}
}
export function setBackgroundColor(color: string) {
  try { tg()?.setBackgroundColor(color); } catch {}
}
export function setBottomBarColor(color: string) {
  try { tg()?.setBottomBarColor(color); } catch {}
}

// --- Closing ---
export function enableClosingConfirmation() {
  try { tg()?.enableClosingConfirmation(); } catch {}
}
export function disableClosingConfirmation() {
  try { tg()?.disableClosingConfirmation(); } catch {}
}

// --- Swipe control ---
export function disableVerticalSwipes() {
  try { tg()?.disableVerticalSwipes(); } catch {}
}
export function enableVerticalSwipes() {
  try { tg()?.enableVerticalSwipes(); } catch {}
}

// --- BackButton ---
export function showBackButton(callback: () => void): () => void {
  try {
    const w = tg();
    if (!w) return () => {};
    w.BackButton.show();
    w.BackButton.onClick(callback);
    return () => { w.BackButton.hide(); w.BackButton.offClick(callback); };
  } catch { return () => {}; }
}

// --- MainButton ---
export function showMainButton(text: string, callback: () => void, color?: string): () => void {
  try {
    const w = tg();
    if (!w) return () => {};
    w.MainButton.setParams({
      text,
      color: color || "#00e676",
      text_color: "#111111",
      is_active: true,
      is_visible: true,
    });
    w.MainButton.onClick(callback);
    return () => { w.MainButton.hide(); w.MainButton.offClick(callback); };
  } catch { return () => {}; }
}
export function hideMainButton() {
  try { tg()?.MainButton.hide(); } catch {}
}

// --- Dialogs ---
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const w = tg();
      if (!w) { resolve(true); return; }
      w.showConfirm(message, (confirmed) => resolve(confirmed));
    } catch { resolve(true); }
  });
}

// --- Story sharing ---
export function shareToStory(mediaUrl: string, text?: string) {
  try {
    tg()?.shareToStory(mediaUrl, {
      text,
      widget_link: { url: "https://t.me/synthbet_bot", name: "Déja." },
    });
  } catch {}
}

// --- Fullscreen ---
export function requestFullscreen() {
  try { tg()?.requestFullscreen(); } catch {}
}
export function exitFullscreen() {
  try { tg()?.exitFullscreen(); } catch {}
}

// --- CloudStorage ---
export function cloudSet(key: string, value: string): Promise<void> {
  return new Promise((resolve) => {
    try { tg()?.CloudStorage.setItem(key, value, () => resolve()); } catch { resolve(); }
  });
}
export function cloudGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try { tg()?.CloudStorage.getItem(key, (err, val) => resolve(err ? null : val)); } catch { resolve(null); }
  });
}

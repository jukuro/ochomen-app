"use client";

import { useState } from "react";
import { CalendarDays, Loader2, Link2, Unlink, RefreshCw, Copy, Check } from "lucide-react";
import type { Entry } from "@/lib/types";
import type { PlanId } from "@/components/PremiumModal";
import type { CalendarSyncPrefs, GoogleCalendarTokens } from "@/lib/calendarSyncPrefs";
import {
  createAppleFeedToken,
  saveGoogleCalendarTokens,
} from "@/lib/calendarSyncPrefs";
import { flattenSyncableTodos } from "@/lib/calendarTodos";
import { downloadAllTodosAsIcs } from "@/lib/calendarExport";
import {
  getAppleCalendarHttpsUrl,
  getAppleCalendarSubscribeUrl,
  publishAppleCalendarFeed,
  runGoogleCalendarSync,
} from "@/lib/calendarSyncClient";

interface CalendarSyncSectionProps {
  entries: Entry[];
  prefs: CalendarSyncPrefs;
  tokens: GoogleCalendarTokens | null;
  currentPlan: PlanId;
  calendarName?: string;
  googleConfigured: boolean;
  appleFeedConfigured: boolean;
  onPrefsChange: (prefs: CalendarSyncPrefs) => void;
  onTokensChange: (tokens: GoogleCalendarTokens | null) => void;
  onEntriesChange: (entries: Entry[]) => void;
  onShowPremium?: () => void;
  onToast?: (message: string) => void;
}

export function CalendarSyncSection({
  entries,
  prefs,
  tokens,
  currentPlan,
  calendarName,
  googleConfigured,
  appleFeedConfigured,
  onPrefsChange,
  onTokensChange,
  onEntriesChange,
  onShowPremium,
  onToast,
}: CalendarSyncSectionProps) {
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  const requirePremium = () => {
    if (currentPlan === "premium") return false;
    onShowPremium?.();
    return true;
  };

  const handleConnectGoogle = () => {
    if (requirePremium()) return;
    if (!googleConfigured) {
      onToast?.("Google連携はサーバー設定（GOOGLE_CLIENT_ID）が必要です");
      return;
    }
    window.location.href = "/api/calendar/google/auth";
  };

  const handleDisconnectGoogle = () => {
    saveGoogleCalendarTokens(null);
    onTokensChange(null);
    onPrefsChange({
      ...prefs,
      googleConnected: false,
      lastSyncAt: undefined,
    });
    onToast?.("Googleカレンダー連携を解除しました");
  };

  const handleManualSync = async () => {
    if (requirePremium()) return;
    if (!tokens) {
      onToast?.("先に Google カレンダーと連携してください");
      return;
    }
    setSyncing(true);
    try {
      const result = await runGoogleCalendarSync({
        entries,
        prefs,
        tokens,
        calendarName,
      });
      onEntriesChange(result.entries);
      onPrefsChange(result.prefs);
      onTokensChange(result.tokens);
      saveGoogleCalendarTokens(result.tokens);
      onToast?.(`Google同期: ${result.message}`);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  };

  const handleEnableAppleFeed = async () => {
    if (requirePremium()) return;
    if (!appleFeedConfigured) {
      onToast?.("Apple購読は Supabase 010 マイグレーションと SERVICE_ROLE_KEY が必要です");
      return;
    }
    const token = prefs.appleFeedToken || createAppleFeedToken();
    const ok = await publishAppleCalendarFeed({
      token,
      todos: flattenSyncableTodos(entries),
      calendarName,
    });
    if (!ok) {
      onToast?.("Apple購読フィードの公開に失敗しました");
      return;
    }
    onPrefsChange({
      ...prefs,
      appleFeedEnabled: true,
      appleFeedToken: token,
    });
    onToast?.("Appleカレンダー購読URLを用意しました");
  };

  const handleCopyAppleUrl = async () => {
    if (!prefs.appleFeedToken) return;
    const url = getAppleCalendarSubscribeUrl(prefs.appleFeedToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      onToast?.("購読URLをコピーしました（Appleカレンダー → カレンダーを追加）");
    } catch {
      onToast?.(getAppleCalendarHttpsUrl(prefs.appleFeedToken));
    }
  };

  const handleExportAllIcs = () => {
    const ok = downloadAllTodosAsIcs(flattenSyncableTodos(entries), calendarName);
    onToast?.(ok ? "予定ファイル（.ics）を保存しました" : "出力できる予定がありません");
  };

  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        外部カレンダー連携
        {currentPlan !== "premium" && (
          <span className="ml-1 text-[9px] font-normal normal-case text-amber-600">（プレミアム）</span>
        )}
      </span>

      <div className="space-y-2.5">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                <CalendarDays size={12} /> Google カレンダー（双方向）
              </span>
              <span className="text-[9px] text-slate-400 leading-relaxed block mt-0.5">
                {prefs.googleConnected
                  ? "予定の追加・更新を自動反映。Google側の予定も取り込みます"
                  : "OAuth で連携し、予定を双方向同期"}
              </span>
              {!prefs.googleConnected && (
                <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 block mt-1.5 leading-relaxed">
                  連携時「Google で確認されていません」と出たら、画面左下の「続行」をタップしてください（開発・テスト中のアプリです。本番公開時に Google 審査を申請します）
                </span>
              )}
            </div>
            {prefs.googleConnected ? (
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="text-[10px] font-bold text-slate-500 flex items-center gap-1 shrink-0"
              >
                <Unlink size={12} /> 解除
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="text-[10px] font-bold text-teal-700 flex items-center gap-1 shrink-0"
              >
                <Link2 size={12} /> 連携
              </button>
            )}
          </div>

          {prefs.googleConnected && (
            <>
              <label className="flex justify-between items-center text-[10px] text-slate-600">
                <span>Google から予定を取り込む</span>
                <input
                  type="checkbox"
                  checked={prefs.importFromGoogle}
                  onChange={(e) =>
                    onPrefsChange({ ...prefs, importFromGoogle: e.target.checked })
                  }
                  className="accent-teal-600 w-4 h-4"
                />
              </label>
              <label className="flex justify-between items-center text-[10px] text-slate-600">
                <span>自動同期（30分ごと）</span>
                <input
                  type="checkbox"
                  checked={prefs.googleAutoSync}
                  onChange={(e) =>
                    onPrefsChange({ ...prefs, googleAutoSync: e.target.checked })
                  }
                  className="accent-teal-600 w-4 h-4"
                />
              </label>
              <button
                type="button"
                disabled={syncing || !tokens}
                onClick={() => void handleManualSync()}
                className="w-full py-2 rounded-lg bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                今すぐ同期
              </button>
              {prefs.lastSyncAt && (
                <p className="text-[9px] text-slate-400 text-center">
                  最終同期: {new Date(prefs.lastSyncAt).toLocaleString("ja-JP")}
                </p>
              )}
            </>
          )}
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 space-y-2">
          <div>
            <span className="text-xs font-bold text-slate-700 block">Apple カレンダー（購読）</span>
            <span className="text-[9px] text-slate-400 leading-relaxed block mt-0.5">
              購読URLで一方向同期。オフライン取込は .ics 一括出力
            </span>
          </div>
          {prefs.appleFeedEnabled && prefs.appleFeedToken ? (
            <button
              type="button"
              onClick={() => void handleCopyAppleUrl()}
              className="w-full py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              購読URLをコピー
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnableAppleFeed()}
              className="w-full py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700"
            >
              購読URLを作成
            </button>
          )}
          <button
            type="button"
            onClick={handleExportAllIcs}
            className="w-full py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700"
          >
            すべての予定を .ics で保存
          </button>
        </div>
      </div>
    </div>
  );
}

import type { EntryScope } from "@/lib/types";

/** 書類のジャンル選択（スキャン・編集） */
export const ENTRY_SCOPE_OPTIONS: {
  key: EntryScope;
  label: string;
  icon: string;
  desc?: string;
}[] = [
  { key: "school", label: "学校・園", icon: "🏫", desc: "おたより・行事・給食" },
  { key: "community", label: "地域", icon: "📍", desc: "町内・自治会" },
  { key: "family", label: "家族", icon: "🏠", desc: "家庭の予定" },
];

/** 検索・カレンダーの絞り込みタイル */
export const SCOPE_FILTER_PRESETS = [
  { key: "all", label: "すべて", icon: "📋", hint: "全部" },
  { key: "school", label: "学校・園", icon: "🏫", hint: "おたより" },
  { key: "family", label: "家族", icon: "🏠", hint: "家庭" },
  { key: "community", label: "地域", icon: "📍", hint: "自治会" },
] as const;

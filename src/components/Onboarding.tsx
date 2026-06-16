"use client";

import { useState } from "react";
import { BookOpen, Camera, Check, ChevronRight, Loader2, Trash2 } from "lucide-react";
import type { Child } from "@/lib/types";

interface OnboardingProps {
  onComplete: (data: {
    children: Child[];
    kindergartenName: string;
    categories: string[];
    didDemoScan: boolean;
  }) => void;
}

const ORG_TYPES = [
  { id: "保育園・幼稚園", label: "保育園・幼稚園 🌸" },
  { id: "小学校", label: "小学校 🎒" },
  { id: "中学校・高校", label: "中学校・高校 🏫" },
  { id: "地域活動・PTA", label: "地域活動・PTA 🤝" },
];

const SUGGESTED_CATEGORIES: Record<string, string[]> = {
  "保育園・幼稚園": ["お帳面", "園だより", "給食だより", "年間予定"],
  "小学校": ["学年だより", "給食・ほけん", "宿題・持ち物", "PTA・行事"],
  "中学校・高校": ["部活だより", "時間割・予定表", "プリント類", "学年通信"],
  "地域活動・PTA": ["回覧板", "役員会だより", "行事スケジュール", "会計報告"],
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedOrgTypes, setSelectedOrgTypes] = useState<string[]>(["保育園・幼稚園"]);
  const [orgName, setOrgName] = useState("");
  
  const [people, setPeople] = useState<Child[]>([
    { id: "c1", name: "こあ 👦", avatar: "👦", color: "bg-blue-500", dotColor: "bg-blue-500" }
  ]);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAvatar, setNewPersonAvatar] = useState("👦");

  const [categories, setCategories] = useState<string[]>(SUGGESTED_CATEGORIES["保育園・幼稚園"]);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const [demoDone, setDemoDone] = useState(false);

  const handleOrgTypeToggle = (type: string) => {
    let nextTypes = [...selectedOrgTypes];
    if (nextTypes.includes(type)) {
      if (nextTypes.length > 1) {
        nextTypes = nextTypes.filter((t) => t !== type);
      }
    } else {
      nextTypes.push(type);
    }
    setSelectedOrgTypes(nextTypes);

    // カテゴリをマージ
    const merged = new Set<string>();
    nextTypes.forEach((t) => {
      const cats = SUGGESTED_CATEGORIES[t] || [];
      cats.forEach((c) => merged.add(c));
    });
    setCategories(Array.from(merged));
  };

  const handleAddPerson = () => {
    if (!newPersonName.trim()) return;
    const colors = ["bg-blue-500", "bg-pink-500", "bg-teal-500", "bg-amber-500"];
    const col = colors[people.length % colors.length];
    const newPerson: Child = {
      id: `c_${Date.now()}`,
      name: `${newPersonName.trim()} ${newPersonAvatar}`,
      avatar: newPersonAvatar,
      color: col,
      dotColor: col,
    };
    setPeople([...people, newPerson]);
    setNewPersonName("");
  };

  const handleRemovePerson = (id: string) => {
    if (people.length <= 1) return;
    setPeople(people.filter((p) => p.id !== id));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) return;
    setCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName("");
  };

  const handleRemoveCategory = (name: string) => {
    setCategories(categories.filter((c) => c !== name));
  };

  const finish = (didDemoScan: boolean) => {
    onComplete({
      children: people,
      kindergartenName: orgName.trim() || `${selectedOrgTypes.join("＆")}の活動`,
      categories: categories.length > 0 ? categories : ["お帳面"],
      didDemoScan,
    });
  };

  const runDemoScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setDemoDone(true);
    }, 1500);
  };

  return (
    <div className="absolute inset-0 bg-white z-[70] flex flex-col text-slate-800">
      <div className="pt-10 px-5 pb-4">
        <div className="flex items-center gap-2 text-teal-700 font-bold">
          <BookOpen size={20} />
          <span>おたより帳（多目的・家族共有）</span>
        </div>
        <div className="flex gap-1.5 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition ${
                s <= step ? "bg-teal-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-800">まずは対象の人を登録</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                書類ごとに対象メンバー（子ども・大人など）をアサインするために、はじめに人の登録をします。（無料プランで2名まで登録可能です）
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block">登録メンバー一覧</span>
              <div className="space-y-2">
                {people.map((p) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm">
                    <span className="font-bold">{p.avatar} {p.name.split(" ")[0]}</span>
                    {people.length > 1 && (
                      <button onClick={() => handleRemovePerson(p.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {people.length < 2 ? (
                <div className="flex gap-1.5 pt-2">
                  <input
                    type="text"
                    placeholder="例：はると"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-teal-500"
                  />
                  <select
                    value={newPersonAvatar}
                    onChange={(e) => setNewPersonAvatar(e.target.value)}
                    className="border border-slate-200 rounded-xl p-2.5 text-xs bg-white"
                  >
                    <option value="👦">👦 男子</option>
                    <option value="👧">👧 女子</option>
                    <option value="👶">👶 赤ちゃん</option>
                    <option value="👨">👨 大人男性</option>
                    <option value="👩">👩 大人女性</option>
                  </select>
                  <button
                    onClick={handleAddPerson}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 rounded-xl text-xs font-bold flex items-center justify-center"
                  >
                    追加
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 text-[10px] text-amber-800 p-2.5 rounded-xl border border-amber-100">
                  💡 無料プランでは最大2名まで同時に登録可能です。
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 block">どのような活動でお使いですか？（複数選択可）</span>
                <p className="text-[10px] text-slate-400">用途に応じてオススメのカテゴリセットを自動作成します。</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ORG_TYPES.map((type) => {
                  const isSelected = selectedOrgTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleOrgTypeToggle(type.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? "bg-teal-50 border-teal-500 text-teal-800"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  施設・学校・団体名（複数ある場合はカンマ等で区切って入力）
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="例：しいの実小学校, 青葉中学校, 中央PTA"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

         {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-800">カテゴリを調整する</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                書類の分類タグを決めましょう。最初によくスキャンするプリント類に合わせて、追加・削除が可能です。
              </p>
              <div className="bg-teal-50 border border-teal-200/50 rounded-xl p-3 text-[10px] text-teal-800 leading-relaxed mt-3">
                💡 <strong>分類を決めきれない方へ</strong>：<br/>
                カテゴリの選択をスキップして進めても大丈夫です！プリントやお帳面を適当にスキャンすれば、AIが書類の内容を分析し、自動で最適なカテゴリ（「お帳面」「園だより」等）をオススメ・分類してくれます。
              </div>
            </div>
            
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700">
                  <span>📂 {cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="text-slate-400 hover:text-red-500">
                    削除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 pt-2">
              <input
                type="text"
                placeholder="新しい分類タグ名"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-teal-500"
              />
              <button
                onClick={handleAddCategory}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 rounded-xl text-xs font-bold"
              >
                追加
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-800">スキャンとアサインを試す</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                お便りや予定表をカメラで撮ると、AIが自動解析。登録したメンバーごとに「提出期限」や「持ち物タスク」をカレンダーへ配置します。
              </p>
            </div>

            {isScanning ? (
              <div className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-2xl p-10 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-teal-600" size={32} />
                <span className="text-sm text-teal-700 font-bold">AIが読み取り中...</span>
              </div>
            ) : demoDone ? (
              <div className="border border-teal-200 bg-teal-50/50 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                  <Check size={14} /> 解析デモ完了！
                </span>
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <p className="font-bold text-teal-800">📄 読み取ったお知らせ</p>
                  <p>「6月15日までに歯科健診の問診票を提出してください。担当：全員」</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-amber-800">👤 アサインされたやること</span>
                  <p className="text-slate-700">【{people[0].name.split(" ")[0]}】歯科健診の問診票提出（期限: 6/15）</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={runDemoScan}
                className="w-full border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-2xl p-10 flex flex-col items-center gap-2 text-teal-700 hover:bg-teal-50 transition"
              >
                <Camera size={32} />
                <span className="text-sm font-bold">スキャン読み取りのデモを体験</span>
                <span className="text-[10px] text-teal-600/70">ワンタップで自動スケジュールと割り当てをお見せします</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-slate-100 space-y-2">
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1 hover:bg-teal-700 transition"
          >
            次へ <ChevronRight size={16} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => finish(demoDone)}
              className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1 hover:bg-teal-700 transition"
            >
              登録設定を完了してはじめる <ChevronRight size={16} />
            </button>
            {!demoDone && (
              <button
                type="button"
                onClick={() => finish(false)}
                className="w-full py-2.5 text-slate-400 text-sm font-medium"
              >
                スキップして始める
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

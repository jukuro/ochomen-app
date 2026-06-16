"use client";

import { useState } from "react";
import { BookOpen, Camera, Check, ChevronRight, Loader2 } from "lucide-react";
import type { Child } from "@/lib/types";

interface OnboardingProps {
  onComplete: (data: {
    children: Child[];
    kindergartenName: string;
    categories: string[];
    didDemoScan: boolean;
  }) => void;
}

const DEFAULT_CATEGORIES = ["お帳面", "園だより", "給食だより"];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState("");
  const [childAvatar, setChildAvatar] = useState("👦");
  const [kindergartenName, setKindergartenName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [isScanning, setIsScanning] = useState(false);
  const [demoDone, setDemoDone] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const buildChild = (): Child => ({
    id: "c1",
    name: `${childName.trim()} ${childAvatar}`,
    avatar: childAvatar,
    color: "bg-blue-500",
    dotColor: "bg-blue-500",
  });

  const finish = (didDemoScan: boolean) => {
    onComplete({
      children: [buildChild()],
      kindergartenName: kindergartenName.trim() || "しいの実保育園",
      categories: selectedCategories.length > 0 ? selectedCategories : DEFAULT_CATEGORIES,
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
    <div className="absolute inset-0 bg-white z-[70] flex flex-col">
      <div className="pt-10 px-5 pb-4">
        <div className="flex items-center gap-2 text-teal-700 font-bold">
          <BookOpen size={20} />
          <span>おたより帳</span>
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
              <h2 className="text-xl font-bold text-slate-800">はじめまして</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                お子さまと保育園の情報を登録してください。
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  お子さまの名前
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="例：たろう"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">アイコン</label>
                <div className="flex gap-2">
                  {["👦", "👧", "👶"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setChildAvatar(emoji)}
                      className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center border-2 transition ${
                        childAvatar === emoji
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">
                  保育園・幼稚園名
                </label>
                <input
                  type="text"
                  value={kindergartenName}
                  onChange={(e) => setKindergartenName(e.target.value)}
                  placeholder="例：しいの実保育園"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-800">カテゴリーを選ぶ</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                よく使う分類を選んでください。あとから変更できます。
              </p>
            </div>
            <div className="space-y-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition text-sm font-bold ${
                      selected
                        ? "border-teal-500 bg-teal-50 text-teal-800"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {cat}
                    {selected && <Check size={18} className="text-teal-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-slate-800">スキャンを試す</h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                お帳面やお便りを撮影すると、AIが読み取ってタスクを自動作成します。
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
                  <Check size={14} /> 読み取り完了
                </span>
                <div className="text-sm text-slate-700 space-y-2 leading-relaxed">
                  <p className="font-bold text-teal-800">先生から</p>
                  <p>今日は園庭でお砂遊びをしました。とても楽しそうでした。</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm">
                  <span className="font-bold text-amber-800">やること（自動検出）</span>
                  <p className="text-slate-700 mt-1">お砂遊び用のお着替えを持たせる → 明日</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={runDemoScan}
                className="w-full border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-2xl p-10 flex flex-col items-center gap-2 text-teal-700 hover:bg-teal-50 transition"
              >
                <Camera size={32} />
                <span className="text-sm font-bold">デモでスキャン体験</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-slate-100 space-y-2">
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 1 && !childName.trim()}
            onClick={() => setStep(step + 1)}
            className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-1"
          >
            次へ <ChevronRight size={16} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => finish(demoDone)}
              className="w-full py-3.5 bg-teal-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1"
            >
              はじめる <ChevronRight size={16} />
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

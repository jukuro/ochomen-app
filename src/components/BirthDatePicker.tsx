"use client";

import { useEffect, useMemo, useState } from "react";
import {
  birthYearOptions,
  daysInMonth,
  parseBirthDateParts,
  toBirthDateIso,
} from "@/lib/birthDatePicker";

interface BirthDatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
}

export function BirthDatePicker({ value, onChange }: BirthDatePickerProps) {
  const initial = parseBirthDateParts(value || undefined);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const years = useMemo(() => birthYearOptions(), []);
  const maxDay = daysInMonth(year, month);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay]
  );

  useEffect(() => {
    const parts = parseBirthDateParts(value || undefined);
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
  }, [value]);

  const update = (y: number, m: number, d: number) => {
    const safeDay = Math.min(d, daysInMonth(y, m));
    setYear(y);
    setMonth(m);
    setDay(safeDay);
    onChange(toBirthDateIso(y, m, safeDay));
  };

  const selectClass =
    "flex-1 min-w-0 px-2 py-3 rounded-xl text-sm font-bold border outline-none focus:border-[var(--color-primary)] appearance-none text-center";
  const selectStyle = { borderColor: "var(--color-border)", background: "var(--color-bg)" };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="flex-1 space-y-1">
          <span className="text-[9px] font-bold block text-center" style={{ color: "var(--color-muted)" }}>
            年
          </span>
          <select
            value={year}
            onChange={(e) => update(Number(e.target.value), month, day)}
            className={selectClass}
            style={selectStyle}
            aria-label="生年"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </label>
        <label className="w-[88px] space-y-1">
          <span className="text-[9px] font-bold block text-center" style={{ color: "var(--color-muted)" }}>
            月
          </span>
          <select
            value={month}
            onChange={(e) => update(year, Number(e.target.value), day)}
            className={selectClass}
            style={selectStyle}
            aria-label="生月"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </label>
        <label className="w-[88px] space-y-1">
          <span className="text-[9px] font-bold block text-center" style={{ color: "var(--color-muted)" }}>
            日
          </span>
          <select
            value={Math.min(day, maxDay)}
            onChange={(e) => update(year, month, Number(e.target.value))}
            className={selectClass}
            style={selectStyle}
            aria-label="生日"
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}日
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[10px] text-center" style={{ color: "var(--color-muted)" }}>
        年・月・日をタップして選べます
      </p>
    </div>
  );
}

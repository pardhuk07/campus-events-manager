'use client';

import React from 'react';
import { CATEGORY_COLORS } from '@/lib/colors';

interface BudgetChartsProps {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  percentSpent: number;
  categoryBreakdown: Record<string, number>;
}

export default function BudgetCharts({
  totalBudget,
  totalSpent,
  remainingBudget,
  percentSpent,
  categoryBreakdown,
}: BudgetChartsProps) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  // Build slices for each category with its distinct color
  let accumulatedPercent = 0;
  const slices = Object.entries(categoryBreakdown)
    .filter(([_, amount]) => amount > 0)
    .map(([cat, amount]) => {
      const slicePercent = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;
      const strokeLength = (slicePercent / 100) * circumference;
      const strokeOffset = circumference - (accumulatedPercent / 100) * circumference;
      accumulatedPercent += slicePercent;

      const catInfo = CATEGORY_COLORS[cat] || { hex: '#818cf8', label: cat };

      return {
        cat,
        label: catInfo.label,
        hex: catInfo.hex,
        amount,
        percent: Math.round(slicePercent * 10) / 10,
        strokeLength,
        strokeOffset,
      };
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0b1328] border border-[var(--border-navy)] rounded-2xl p-6 shadow-xl text-white">
      {/* 1. Multi-Color Category Donut Chart */}
      <div className="flex flex-col items-center justify-center p-4 bg-[#060b18] rounded-xl border border-[var(--border-navy)]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Fund Distribution Matrix
        </h4>

        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background ring for remaining funds */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#172447"
              strokeWidth="14"
              fill="transparent"
            />

            {/* Individual distinct category slices */}
            {slices.map((slice) => (
              <circle
                key={slice.cat}
                cx="80"
                cy="80"
                r={radius}
                stroke={slice.hex}
                strokeWidth="14"
                strokeDasharray={`${slice.strokeLength} ${circumference}`}
                strokeDashoffset={slice.strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
                fill="transparent"
              />
            ))}
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-2xl font-black bg-gradient-to-r from-violet-200 to-cyan-300 bg-clip-text text-transparent">
              {percentSpent}%
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Utilized</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            <span className="text-slate-300">Spent: ₹{totalSpent.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#172447] border border-slate-700"></span>
            <span className="text-slate-400">Available: ₹{remainingBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Distinct Category Progress Bars */}
      <div className="flex flex-col justify-between p-4 bg-[#060b18] rounded-xl border border-[var(--border-navy)]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Distinct Category Breakdown
        </h4>

        <div className="space-y-3">
          {Object.entries(CATEGORY_COLORS).map(([catKey, info]) => {
            const amount = categoryBreakdown[catKey] || 0;
            const catPercent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

            return (
              <div key={catKey} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: info.hex }}
                    ></span>
                    <span className="font-semibold text-slate-300">{info.label}</span>
                  </div>
                  <span className="font-bold text-white">
                    ₹{amount.toLocaleString()}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">({catPercent}%)</span>
                  </span>
                </div>
                <div className="w-full bg-[#101b37] rounded-full h-2 overflow-hidden border border-[var(--border-navy)]">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${catPercent}%`,
                      backgroundColor: info.hex,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

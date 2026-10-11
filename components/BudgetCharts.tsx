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

      const catInfo = CATEGORY_COLORS[cat] || { hex: '#6366f1', label: cat };

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900">
      {/* 1. Multi-Color Category Donut Chart */}
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50/60 rounded-xl border border-slate-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Fund Distribution Matrix
        </h4>

        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background ring for remaining funds */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#e2e8f0"
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
            <span className="text-2xl font-black bg-gradient-to-r from-violet-600 to-cyan-600 bg-clip-text text-transparent">
              {percentSpent}%
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Utilized</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-600"></span>
            <span className="text-slate-700">Spent: ₹{totalSpent.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="text-slate-500">Remaining: ₹{remainingBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Category Breakdown Bars */}
      <div className="flex flex-col justify-center space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Spending Breakdown by Category
        </h4>

        {Object.entries(categoryBreakdown).map(([cat, amt]) => {
          const catInfo = CATEGORY_COLORS[cat] || { hex: '#6366f1', label: cat };
          const p = totalBudget > 0 ? Math.round((amt / totalBudget) * 100) : 0;

          return (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">{catInfo.label}</span>
                <span className="text-slate-500">
                  ₹{amt.toLocaleString()}{' '}
                  <span className="text-[10px] text-slate-400">({p}%)</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, p)}%`, backgroundColor: catInfo.hex }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

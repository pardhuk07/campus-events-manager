'use client';

import React from 'react';
import { RupeeIcon } from './Icons';

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
  // SVG Donut calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, percentSpent) / 100) * circumference;

  const categoryColors: Record<string, string> = {
    REFRESHMENTS: '#3b82f6', // blue
    PRINTING: '#10b981', // emerald
    PRIZES_MEMENTOS: '#f59e0b', // amber
    LOGISTICS_EQUIPMENT: '#8b5cf6', // purple
    MARKETING_BANNERS: '#ec4899', // pink
    MISCELLANEOUS: '#64748b', // slate
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md text-white">
      {/* 1. Interactive Spent vs Remaining SVG Donut */}
      <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Fund Utilization Matrix
        </h4>

        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="14"
              className="text-slate-800"
              fill="transparent"
            />
            {/* Spent progress ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${
                percentSpent > 85 ? 'text-red-500' : 'text-blue-500'
              } transition-all duration-1000 ease-out`}
              fill="transparent"
            />
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-2xl font-black text-white">{percentSpent}%</span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Utilized</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-300">Spent: ₹{totalSpent.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-700"></span>
            <span className="text-slate-400">Available: ₹{remainingBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Category Distribution Visual Bars */}
      <div className="flex flex-col justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Spending Breakdown by Category
        </h4>

        <div className="space-y-3">
          {Object.entries(categoryBreakdown).map(([cat, amount]) => {
            const catPercent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
            const color = categoryColors[cat] || '#3b82f6';

            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {cat.replace(/_/g, ' ')}
                  </span>
                  <span className="font-bold text-white">
                    ₹{amount.toLocaleString()}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">({catPercent}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${catPercent}%`,
                      backgroundColor: color,
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

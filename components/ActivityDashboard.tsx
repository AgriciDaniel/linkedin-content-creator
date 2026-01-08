import React, { useState, useEffect } from 'react';
import {
  getActivitySummary,
  getRecentPosts,
  getStreak,
  PostActivity,
  ActivitySummary,
} from '../services/activityService';

interface ActivityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDashboard: React.FC<ActivityDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [recentPosts, setRecentPosts] = useState<PostActivity[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [yearData, setYearData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Get full year summary (365 days)
      setSummary(getActivitySummary(365));
      setRecentPosts(getRecentPosts(5));
      setStreak(getStreak());

      // Generate year data for heatmap
      generateYearData();
    }
  }, [isOpen]);

  // Generate full year heatmap data
  const generateYearData = () => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    oneYearAgo.setDate(oneYearAgo.getDate() + 1);

    const data: { date: string; count: number }[] = [];
    const current = new Date(oneYearAgo);

    // Get activity from service
    const activitySummary = getActivitySummary(365);
    const activityMap = new Map<string, number>();

    if (activitySummary) {
      activitySummary.dailyActivity.forEach(day => {
        activityMap.set(day.date, day.count);
      });
    }

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        count: activityMap.get(dateStr) || 0
      });
      current.setDate(current.getDate() + 1);
    }

    setYearData(data);
  };

  if (!isOpen) return null;

  // Calculate max value for heatmap
  const maxActivity = Math.max(...yearData.map(d => d.count), 1);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-200 dark:bg-gray-700/50';
    const intensity = count / maxActivity;
    if (intensity <= 0.25) return 'bg-emerald-300 dark:bg-emerald-700';
    if (intensity <= 0.5) return 'bg-emerald-400 dark:bg-emerald-600';
    if (intensity <= 0.75) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  // Group data into weeks (columns) for GitHub-style display
  const getWeeksData = () => {
    if (yearData.length === 0) return { weeks: [], monthLabels: [] };

    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    // Find the day of week for the first date (0 = Sunday, 1 = Monday, etc.)
    const firstDate = new Date(yearData[0].date);
    const startDay = firstDate.getDay();

    // Pad the first week with empty cells if needed
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: '', count: -1 });
    }

    yearData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // Pad the last week if needed
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: -1 });
      }
      weeks.push(currentWeek);
    }

    // Generate month labels with positions
    const monthLabels: { name: string; position: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const validDay = week.find(d => d.date);
      if (validDay) {
        const date = new Date(validDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            position: weekIndex
          });
          lastMonth = month;
        }
      }
    });

    return { weeks, monthLabels };
  };

  const { weeks, monthLabels } = getWeeksData();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
      case 'scheduled':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
      case 'draft':
        return 'text-gray-500 bg-gray-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  // Calculate total for the year
  const yearTotal = yearData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-[#3E4042]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Activity</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{yearTotal} contributions in the last year</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-65px)] p-5">
          {summary ? (
            <div className="space-y-4">
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalCreated}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Created</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-500">{summary.totalPosted}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Posted</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalScheduled}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Scheduled</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-amber-500">{streak.current}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Day Streak</p>
                </div>
              </div>

              {/* GitHub-style Activity Heatmap */}
              <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Activity Heatmap</h3>

                {/* Month labels */}
                <div className="flex mb-1 ml-8">
                  {monthLabels.map((label, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-gray-500 dark:text-gray-400"
                      style={{
                        position: 'relative',
                        left: `${label.position * 11}px`,
                        marginRight: i < monthLabels.length - 1
                          ? `${(monthLabels[i + 1]?.position - label.position - 1) * 11 - 20}px`
                          : 0
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>

                {/* Heatmap grid */}
                <div className="flex">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[3px] mr-1 text-[9px] text-gray-400 dark:text-gray-500">
                    <span className="h-[10px]"></span>
                    <span className="h-[10px] leading-[10px]">Mon</span>
                    <span className="h-[10px]"></span>
                    <span className="h-[10px] leading-[10px]">Wed</span>
                    <span className="h-[10px]"></span>
                    <span className="h-[10px] leading-[10px]">Fri</span>
                    <span className="h-[10px]"></span>
                  </div>

                  {/* Weeks grid */}
                  <div className="flex gap-[3px] overflow-x-auto">
                    {weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-[3px]">
                        {week.map((day, dayIndex) => (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className={`w-[10px] h-[10px] rounded-sm ${
                              day.count === -1 ? 'bg-transparent' : getHeatmapColor(day.count)
                            }`}
                            title={day.date ? `${day.date}: ${day.count} posts` : ''}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1 mt-3">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mr-1">Less</span>
                  <div className="w-[10px] h-[10px] rounded-sm bg-gray-200 dark:bg-gray-700/50" />
                  <div className="w-[10px] h-[10px] rounded-sm bg-emerald-300 dark:bg-emerald-700" />
                  <div className="w-[10px] h-[10px] rounded-sm bg-emerald-400 dark:bg-emerald-600" />
                  <div className="w-[10px] h-[10px] rounded-sm bg-emerald-500 dark:bg-emerald-500" />
                  <div className="w-[10px] h-[10px] rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1">More</span>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Content Types */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Content Types</h3>
                  <div className="space-y-2">
                    {Object.entries(summary.byContentType).map(([type, count]) => {
                      const percentage = summary.totalCreated > 0 ? (count / summary.totalCreated) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300 w-20 capitalize truncate">{type.replace('-', ' ')}</span>
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-5 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Activity Bar Chart */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Weekly Activity</h3>
                  <div className="flex items-end justify-between gap-1 h-16">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                      const count = summary.weekdayDistribution[index];
                      const maxCount = Math.max(...summary.weekdayDistribution, 1);
                      const height = (count / maxCount) * 100;
                      return (
                        <div key={day + index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center h-10">
                            <div
                              className="w-full max-w-4 bg-emerald-500 rounded-t transition-all"
                              style={{ height: `${Math.max(height, 8)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-400">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h3>
                {recentPosts.length > 0 ? (
                  <div className="space-y-2">
                    {recentPosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center gap-3 p-2 bg-white dark:bg-[#1D2226] rounded-lg border border-gray-200 dark:border-[#3E4042]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 dark:text-gray-200 truncate">{post.topic}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(post.createdAt).toLocaleDateString()} at{' '}
                            {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-medium rounded-full ${getStatusBadge(post.status)}`}>
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
                )}
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  Best streak: {streak.longest} days
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {new Date().getFullYear()} Activity
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading activity data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDashboard;

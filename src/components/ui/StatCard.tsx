import { LucideIcon } from "lucide-react";

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, sub, icon: Icon, iconColor = "text-blue-600", iconBg = "bg-blue-50", trend, trendUp }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {trend && (
        <p className={`text-xs mt-2 font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trendUp ? "▲" : "▼"} {trend}
        </p>
      )}
    </div>
  );
}

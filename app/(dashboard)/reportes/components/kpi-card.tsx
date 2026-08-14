import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  helper,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  helper?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-gray-50 text-gray-600",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
        <div
          className={`rounded-xl p-2 sm:p-2.5 shrink-0 ${colors[color] ?? colors.blue}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
          {helper && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SectionTitle({
  children,
  barColor = "bg-white",
  extra = null,
}: {
  children: React.ReactNode;
  barColor?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
        <span className={`w-2 h-5 sm:h-6 ${barColor} rounded-sm inline-block`}></span>
        {children}
      </h2>
      {extra}
    </div>
  );
}

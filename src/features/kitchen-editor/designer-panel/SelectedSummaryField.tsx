type SelectedSummaryFieldProps = Readonly<{
  label: string;
  value: string;
}>;

export function SelectedSummaryField({ label, value }: SelectedSummaryFieldProps) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-slate-700" title={value}>
        {value}
      </dd>
    </div>
  );
}

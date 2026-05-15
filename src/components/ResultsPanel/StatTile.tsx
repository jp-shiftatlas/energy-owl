type Props = {
  label: string;
  value: string;
  unit?: string;
  state: "idle" | "loading" | "ok" | "unavailable";
  message?: string;
};

export default function StatTile({
  label,
  value,
  unit,
  state,
  message,
}: Props) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-xs uppercase tracking-wider text-offwhite/50">
        {label}
      </span>
      {state === "ok" ? (
        <span className="font-mono text-2xl text-offwhite">
          {value}
          {unit ? (
            <span className="text-base text-offwhite/60 ml-1">{unit}</span>
          ) : null}
        </span>
      ) : state === "loading" ? (
        <span className="font-mono text-2xl text-offwhite/40">—</span>
      ) : (
        <span className="text-sm text-offwhite/70">
          {message ?? "Unavailable."}
        </span>
      )}
    </div>
  );
}

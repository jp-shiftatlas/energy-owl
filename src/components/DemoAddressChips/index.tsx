import { DEMO_ADDRESSES, type DemoAddress } from "../../lib/demoAddresses";

type Props = {
  onSelect: (a: DemoAddress) => void;
};

export default function DemoAddressChips({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-offwhite/50">
        Demo addresses
      </span>
      <div className="flex flex-wrap gap-2">
        {DEMO_ADDRESSES.map((a) => (
          <button
            key={a.address}
            type="button"
            onClick={() => onSelect(a)}
            className="rounded-full border border-sage/40 bg-forest px-3 py-1 text-xs text-offwhite/80 hover:border-sage hover:text-offwhite transition"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (address: string) => void;
};

export default function AddressInput({ onSubmit }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="address" className="text-sm text-offwhite/70">
        Commercial address
      </label>
      <input
        id="address"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="1 Apple Park Way, Cupertino, CA"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md bg-forest border border-sage/40 px-3 py-2 text-base text-offwhite placeholder:text-offwhite/30 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/40 transition"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="self-start rounded-md bg-gold text-forest font-medium px-4 py-2 text-sm hover:bg-gold/90 active:bg-gold/80 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Analyze
      </button>
    </form>
  );
}

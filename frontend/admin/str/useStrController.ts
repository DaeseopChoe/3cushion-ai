export interface StrState {
  length: "Short" | "Standard" | "Long";
  motion: "Constant" | "Acceleration" | "Deceleration";
  speed: "00";
}

export function useStrController({
  initial,
  onChange,
}: {
  initial?: Partial<StrState>;
  onChange: (next: StrState) => void;
}) {
  const [state, setState] = useState<StrState>({
    length: initial?.length ?? "Standard",
    motion: initial?.motion ?? "Constant",
    speed: "00",
  });

  function update<K extends keyof StrState>(key: K, value: StrState[K]) {
    const next = { ...state, [key]: value };
    setState(next);
    onChange(next);
  }

  return { state, update };
}

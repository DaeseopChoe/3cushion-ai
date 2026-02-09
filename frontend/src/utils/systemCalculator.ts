export function calculateByProfileExpr(
  expr: string,
  inputs: Record<string, number>
): Record<string, number> {
  // Trim and ignore empty expressions
  const trimmed = expr.trim();
  if (!trimmed) {
    return {};
  }

  // Split by '=' into left-hand side (LHS) and right-hand side (RHS)
  const [rawLhs, rawRhs] = trimmed.split('=').map((part) => part.trim());

  // If the expression is malformed, just return empty for now (STEP 6-A temporary behavior)
  if (!rawLhs || !rawRhs) {
    return {};
  }

  const lhsKey = rawLhs;

  // RHS is split by '+'; each term is matched against the inputs
  const terms = rawRhs.split('+').map((term) => term.trim());

  let sum = 0;
  for (const term of terms) {
    // Only sum if the term exists in inputs
    if (term in inputs) {
      sum += inputs[term];
    }
  }

  return {
    [lhsKey]: sum,
  };
}


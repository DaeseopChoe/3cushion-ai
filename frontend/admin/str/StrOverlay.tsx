<select value={state.length} onChange={e => update("length", e.target.value as any)}>
  <option>Short</option>
  <option>Standard</option>
  <option>Long</option>
</select>

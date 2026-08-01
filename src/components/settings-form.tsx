export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="settings-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Notice({ error, saved }: { error?: string; saved?: string }) {
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (saved) return <p className="form-success" role="status">保存しました。</p>;
  return null;
}

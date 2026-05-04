import { countryCode } from "@/lib/format";

export function Flag({ country, className = "" }: { country: string; className?: string }) {
  const code = countryCode(country);
  if (!code) {
    return (
      <span aria-hidden className={`inline-block ${className}`} style={{ fontSize: "0.95em" }}>
        🌍
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`fi fi-${code} ${className}`}
      style={{
        display: "inline-block",
        width: "1.25em",
        height: "0.9em",
        borderRadius: 2,
        boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.06)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        verticalAlign: "-0.05em",
      }}
    />
  );
}

const OPTIONS = [
  {
    vendor: "MockRide Assist",
    price: 42,
    wheelchair: true,
    time: "5:20 PM",
    note: "selected — cheapest valid option",
  },
  {
    vendor: "CityCare Ride",
    price: 48,
    wheelchair: true,
    time: "5:45 PM",
    note: "valid alternative",
  },
  {
    vendor: "QuickCab",
    price: 35,
    wheelchair: false,
    time: "5:10 PM",
    note: "rejected — no wheelchair assistance",
  },
  {
    vendor: "PremiumAssist",
    price: 67,
    wheelchair: true,
    time: "5:15 PM",
    note: "rejected — over budget",
  },
];

export default function RidesPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Mock marketplace for Browser Use — not affiliated with real providers.
      </p>
      <h1 style={{ marginBottom: "0.25rem" }}>Ride options</h1>
      <p style={{ color: "var(--muted)" }}>
        Constraints: after 5 PM, under $50, wheelchair assistance required.
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "2rem" }}>
        {OPTIONS.map((o) => (
          <li
            key={o.vendor}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              marginBottom: "0.75rem",
              background: "var(--panel)",
            }}
          >
            <strong>{o.vendor}</strong>
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>
              — ${o.price} — wheelchair: {o.wheelchair ? "yes" : "no"} —{" "}
              {o.time}
            </span>
            <div style={{ color: "var(--accent)", marginTop: 6 }}>{o.note}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

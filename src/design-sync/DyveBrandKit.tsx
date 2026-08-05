import compactLogo from "../assets/dyve-logo-compact-red.svg";
import horizontalLogo from "../assets/dyve-logo-horizontal-red.svg";

const colors = [
  ["Primary", "#FF4A4A"],
  ["Primary Strong", "#FF003D"],
  ["Primary Soft", "#FFF3F3"],
  ["Ink", "#232323"],
  ["Body", "#333333"],
  ["Muted", "#686868"],
  ["Canvas", "#FFFFFF"],
  ["Surface", "#F3F3F3"],
  ["Hairline", "#D8D8D8"],
  ["Dust Pink", "#CEAFBF"],
  ["Blue Green", "#82B7C1"],
  ["Success", "#2E8B57"],
] as const;

export function DyveBrandKit() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 48,
        background: "var(--color-canvas)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <section style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <img src={horizontalLogo} alt="DYVE" style={{ width: 240, height: "auto" }} />
        <img src={compactLogo} alt="DYVE compact mark" style={{ width: 88, height: 88 }} />
      </section>

      <section style={{ marginTop: 64 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-brand)", fontSize: 44, lineHeight: 1.1 }}>
          LINE Seed Sans KR
        </h1>
        <p style={{ margin: "16px 0 0", fontSize: 24, fontWeight: 700 }}>
          Pretendard Bold · 공연과 사람을 연결하는 새로운 다이브
        </p>
        <p style={{ margin: "8px 0 0", color: "var(--color-body)", fontSize: 16 }}>
          Pretendard Regular · Discover artists, venues, and people with DYVE.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
          gap: 16,
          marginTop: 64,
        }}
      >
        {colors.map(([name, value]) => (
          <article key={name} style={{ overflow: "hidden", border: "1px solid var(--color-hairline)", borderRadius: 16 }}>
            <div style={{ height: 112, background: value }} />
            <div style={{ padding: 16, background: "#FFFFFF" }}>
              <strong style={{ display: "block", fontSize: 15 }}>{name}</strong>
              <span style={{ color: "var(--color-muted)", fontSize: 13 }}>{value}</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

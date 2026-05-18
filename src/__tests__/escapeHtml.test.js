import { describe, it, expect } from "vitest";
import { escapeHtml } from "../../public/finance-sanitize.js";

describe("escapeHtml", () => {
  it("escapa caracteres peligrosos para evitar HTML interpretado", () => {
    const payload = '<img src=x onerror="alert(1)"> & <script>alert("x")</script>';

    expect(escapeHtml(payload)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("devuelve cadena vacía para null o undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("convierte comillas simples para evitar inyecciones en fragmentos HTML", () => {
    expect(escapeHtml("O'Hara")).toBe("O&#39;Hara");
  });
});

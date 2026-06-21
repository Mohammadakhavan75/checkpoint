// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("removes scriptable HTML and URL attributes", () => {
    const rendered = renderMarkdown(
      '<img src="x" onerror="globalThis.compromised=true">\n' +
        '[run](javascript:globalThis.compromised=true)',
    ).__html;

    expect(rendered).not.toContain("onerror");
    expect(rendered).not.toMatch(/href=["']javascript:/i);
    expect(rendered).not.toContain("<script");
  });

  it("preserves ordinary Markdown", () => {
    const rendered = renderMarkdown("**safe** [docs](https://example.com)").__html;

    expect(rendered).toContain("<strong>safe</strong>");
    expect(rendered).toContain('href="https://example.com"');
  });

  it("keeps task-list checkboxes interactive", () => {
    const rendered = renderMarkdown("- [ ] pending\n- [x] done").__html;

    expect(rendered.match(/type="checkbox"/g)).toHaveLength(2);
    expect(rendered).not.toContain("disabled");
  });
});

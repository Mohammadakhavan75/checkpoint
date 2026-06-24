import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Render user-authored Markdown without allowing it to cross the browser's
 * data-to-code boundary. Task-list checkboxes are re-enabled only after the
 * generated HTML has been sanitized.
 */
export function renderMarkdown(text: string): { __html: string } {
  try {
    const rawHtml = marked.parse(text, { gfm: true, breaks: true }) as string;
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
    });
    const template = document.createElement("template");
    template.innerHTML = sanitizedHtml;
    template.content
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((checkbox) => checkbox.removeAttribute("disabled"));
    return { __html: template.innerHTML };
  } catch (error) {
    console.error("Markdown parse error", error);
    return {
      __html: DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }),
    };
  }
}

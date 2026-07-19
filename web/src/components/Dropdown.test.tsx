// @vitest-environment jsdom
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dropdown, type DropdownOption } from "./Dropdown";

const OPTS: DropdownOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Bravo" },
  { value: "c", label: "Charlie" },
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(value: string, onChange: (v: string) => void) {
  act(() => root.render(<Dropdown value={value} options={OPTS} onChange={onChange} />));
}

const trigger = () => container.querySelector(".dd-trigger") as HTMLButtonElement;
const menu = () => container.querySelector(".dd-menu");
const optionEls = () => Array.from(container.querySelectorAll(".dd-option")) as HTMLElement[];

function fire(el: Element, type: string, init: Record<string, unknown> = {}) {
  act(() => {
    el.dispatchEvent(
      type === "keydown"
        ? new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init })
        : new MouseEvent(type, { bubbles: true, cancelable: true, ...init }),
    );
  });
}

describe("Dropdown", () => {
  it("shows the selected option's label and no popup until opened", () => {
    render("b", vi.fn());
    expect(trigger().textContent).toContain("Bravo");
    expect(menu()).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("opens on click and lists every option as a listbox", () => {
    render("a", vi.fn());
    fire(trigger(), "click");
    expect(menu()).not.toBeNull();
    expect(menu()!.getAttribute("role")).toBe("listbox");
    expect(optionEls().map((o) => o.textContent)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("reports the chosen value and closes when an option is picked", () => {
    const onChange = vi.fn();
    render("a", onChange);
    fire(trigger(), "click");
    fire(optionEls()[2], "mousedown"); // Charlie
    expect(onChange).toHaveBeenCalledWith("c");
    expect(menu()).toBeNull();
  });

  it("navigates and selects by keyboard (ArrowDown x2 + Enter)", () => {
    const onChange = vi.fn();
    render("a", onChange);
    fire(trigger(), "keydown", { key: "ArrowDown" }); // open, active -> a
    fire(trigger(), "keydown", { key: "ArrowDown" }); // active -> b
    fire(trigger(), "keydown", { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("b");
    expect(menu()).toBeNull();
  });

  it("closes on Escape without choosing", () => {
    const onChange = vi.fn();
    render("a", onChange);
    fire(trigger(), "click");
    expect(menu()).not.toBeNull();
    fire(trigger(), "keydown", { key: "Escape" });
    expect(menu()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on an outside mousedown", () => {
    render("a", vi.fn());
    fire(trigger(), "click");
    expect(menu()).not.toBeNull();
    fire(document.body, "mousedown");
    expect(menu()).toBeNull();
  });
});

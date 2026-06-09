import { useEffect, useRef } from "react";

// Boot loader: types a machine action + a human comment
//   session.close()  // checkpoint · resume here
// then extracts the `//` and grows it into the CHECK//POINT wordmark — the
// comment becomes the product's promise. Shown while auth initializes.

const CODE = "session.close()  "; // the machine action
const CMT = "checkpoint · resume here"; // the human note (the comment)

// Playback speed. <1 is faster, >1 is slower. The full sequence at 1 is ~7s.
const SPEED = 1;

export function CheckpointLoader({ onDone }: { onDone?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = (sel: string) => root.querySelector(sel) as HTMLElement;

    const loader = $(".loader");
    const statusrow = $(".statusrow");
    const led = $(".led");
    const syslabel = $(".syslabel");
    const line = $(".line");
    const check = $(".check");
    const point = $(".point");
    const code = $(".code");
    const cmt = $(".cmt");
    const slash = $(".slash");
    const cursor = $(".cursor");
    const tagline = $(".tagline");
    const bar = $(".bar");
    const barfill = $(".barfill");

    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms * SPEED));
    };
    const typeInto = (el: HTMLElement, str: string, startAt: number, perChar: number) => {
      for (let i = 0; i < str.length; i++) {
        const n = i;
        after(startAt + n * perChar, () => {
          el.textContent = str.slice(0, n + 1);
        });
      }
      return startAt + str.length * perChar;
    };

    function reset() {
      line.classList.remove("mark");
      check.classList.remove("show");
      point.classList.remove("show");
      code.classList.remove("gone");
      cmt.classList.remove("gone");
      code.textContent = "";
      cmt.textContent = "";
      slash.style.opacity = "0";
      slash.classList.remove("appear", "pulse");
      cursor.classList.remove("gone");
      line.insertBefore(cursor, slash); // cursor starts right after the code
      tagline.classList.remove("show");
      tagline.innerHTML = "";
      statusrow.classList.remove("show");
      led.classList.remove("online");
      syslabel.textContent = "reading checkpoint";
      bar.classList.remove("show");
      barfill.style.transition = "none";
      barfill.style.width = "0%";
      void barfill.offsetWidth;
      barfill.style.transition = "";
      loader.classList.remove("done");
    }

    const finish = () => onDoneRef.current?.();

    reset();

    // Reduced motion: skip the choreography, show the resolved brand, hand off.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      statusrow.classList.add("show");
      code.classList.add("gone");
      cmt.classList.add("gone");
      cursor.classList.add("gone");
      slash.style.opacity = "1";
      line.classList.add("mark");
      check.classList.add("show");
      point.classList.add("show");
      led.classList.add("online");
      syslabel.textContent = "online";
      bar.classList.add("show");
      barfill.style.width = "100%";
      tagline.innerHTML = '<span class="slash2">//</span> resume where you left off';
      tagline.classList.add("show");
      after(900, finish);
      return () => timers.forEach(clearTimeout);
    }

    after(150, () => statusrow.classList.add("show"));

    // 1. type the machine action
    const codeEnd = typeInto(code, CODE, 480, 52);

    // 2. the // appears — the comment marker / the checkpoint
    after(codeEnd + 140, () => {
      slash.style.opacity = "1";
      slash.classList.add("appear");
      line.insertBefore(cursor, point); // move cursor to type the human note
    });

    // 3. type the human note (the comment)
    const cmtEnd = typeInto(cmt, CMT, codeEnd + 360, 46);

    // 4. let it sit — the note your last session left you
    const holdEnd = cmtEnd + 620;

    // 5. extract the checkpoint: collapse code + comment
    after(holdEnd, () => {
      syslabel.textContent = "restoring";
      cursor.classList.add("gone");
      code.classList.add("gone");
      cmt.classList.add("gone");
    });
    // 6. the lone // pulses — checkpoint planted
    after(holdEnd + 560, () => slash.classList.add("pulse"));
    after(holdEnd + 900, () => slash.classList.remove("pulse"));

    // 7. grow into the wordmark + system online
    const growAt = holdEnd + 760;
    after(growAt, () => {
      line.classList.add("mark");
      check.classList.add("show");
      point.classList.add("show");
    });
    after(growAt + 350, () => {
      led.classList.add("online");
      syslabel.textContent = "online";
      bar.classList.add("show");
    });
    after(growAt + 550, () => {
      barfill.style.width = "100%";
    });

    // 8. the payoff: the comment becomes the promise
    after(growAt + 750, () => {
      tagline.innerHTML = '<span class="slash2">//</span> resume where you left off';
      tagline.classList.add("show");
    });

    // 9. hand off to the app
    const finishAt = growAt + 1700;
    after(finishAt, () => loader.classList.add("done"));
    after(finishAt + 1000, finish); // after the fade-out completes

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="ckl" ref={rootRef}>
      <div className="loader">
        <div className="statusrow">
          <span className="led" />
          <span className="syslabel">reading checkpoint</span>
        </div>

        {/* order: CHECK | code | cursor | // | comment | POINT */}
        <div className="line">
          <span className="flank check">CHECK</span>
          <span className="seg code" />
          <span className="cursor" />
          <span className="slash" style={{ opacity: 0 }}>
            //
          </span>
          <span className="seg cmt" />
          <span className="flank point">POINT</span>
        </div>

        <div className="tagline" />

        <div className="bar">
          <i className="barfill" />
        </div>
      </div>
    </div>
  );
}

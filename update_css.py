import re

with open('web/src/styles/app.css', 'r') as f:
    css = f.read()

# Add new variables
root_vars_to_add = """  --side-rail-bg: rgba(255, 255, 255, 0.96);
  --avatar-bg: #d8e2e1;
  --step-bg: #f0f2f2;
  --button-text: #fff;
  --text-muted-1: #3f474f;
  --text-muted-2: #59636b;
  --text-muted-3: #4e5961;
  --text-label: #303841;
  --input-bg: #fff;
  --focus-ring: rgba(8, 108, 103, 0.18);"""

dark_mode_vars = """
:root.dark {
  --bg: #111418;
  --surface: #1a1e23;
  --surface-quiet: #22272e;
  --text: #e6ebf0;
  --muted: #8b96a0;
  --line: #343c45;
  --line-soft: #272d35;
  --teal: #3baea7;
  --teal-dark: #4ddad1;
  --teal-soft: #143534;
  --green: #67b589;
  --amber: #e6a735;
  --danger: #d96262;
  --shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  
  --side-rail-bg: rgba(17, 20, 24, 0.96);
  --avatar-bg: #2d3742;
  --step-bg: #22272e;
  --button-text: #111418;
  --text-muted-1: #a9b5bf;
  --text-muted-2: #929ea8;
  --text-muted-3: #929ea8;
  --text-label: #d1dae3;
  --input-bg: #1a1e23;
  --focus-ring: rgba(59, 174, 167, 0.25);
}
"""

css = css.replace("  --shadow: 0 18px 50px rgba(18, 24, 31, 0.06);", f"  --shadow: 0 18px 50px rgba(18, 24, 31, 0.06);\n{root_vars_to_add}")
css = css.replace("text-rendering: optimizeLegibility;\n}", f"text-rendering: optimizeLegibility;\n}}\n{dark_mode_vars}")

# Replace hardcoded values
css = css.replace("background: rgba(255, 255, 255, 0.96);", "background: var(--side-rail-bg);")
css = css.replace("background: #d8e2e1;", "background: var(--avatar-bg);")
css = css.replace("background: #f0f2f2;", "background: var(--step-bg);")
css = css.replace("color: #fff;", "color: var(--button-text);")
css = css.replace("color: #3f474f;", "color: var(--text-muted-1);")
css = css.replace("background: #fff;", "background: var(--input-bg);")
css = css.replace("color: #59636b;", "color: var(--text-muted-2);")
css = css.replace("color: #4e5961;", "color: var(--text-muted-3);")
css = css.replace("color: #303841;", "color: var(--text-label);")
css = css.replace("outline: 3px solid rgba(8, 108, 103, 0.18);", "outline: 3px solid var(--focus-ring);")

with open('web/src/styles/app.css', 'w') as f:
    f.write(css)

print("CSS Updated")

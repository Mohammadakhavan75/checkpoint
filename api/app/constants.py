"""Domain constants ported from the brain_os.html prototype."""
from __future__ import annotations

# The full set of legal item states.
STATES: tuple[str, ...] = (
    "idea",
    "needsdef",
    "active",
    "scout",
    "blocked",
    "waiting",
    "deferred",
    "done",
    "killed",
)

# Outcomes a checkpoint can record (a subset that an item state is set to).
OUTCOMES: tuple[str, ...] = ("active", "deferred", "blocked", "done")

DOMAINS: tuple[str, ...] = ("DDWS", "HPC", "Farokhi", "Research", "Teaching", "Personal")
RESERVOIR = "reservoir"
# Where mirrored Google Calendar events are filed (Phase 2). Like the reservoir,
# a reserved pseudo-domain rather than one of the user's own.
CALENDAR = "calendar"

# How many days ahead a scheduled item is "on deck" — it surfaces in Ready to GO
# once it falls inside this horizon (but only reaches Today on its actual day).
READY_HORIZON_DAYS = 7

MODES: tuple[str, ...] = ("Do", "Scout", "Plan", "Deep")

# classification quadrant (procedure|scope) -> mode.
# unknown|unbounded is intentionally empty (TBD / paralysis trap).
CLASS_MODE: dict[str, str] = {
    "known|bounded": "Do",
    "unknown|bounded": "Scout",
    "known|unbounded": "Plan",
    "unknown|unbounded": "",
}

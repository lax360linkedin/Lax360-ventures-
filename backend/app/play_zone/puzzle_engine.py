"""A Python port of the Puzzle Pop engine (frontend/src/playzone/games/puzzlePop/engine.js), used to REPLAY a submitted game on the server.

The game is deterministic: the same level, seed and moves always give the same board and score. The server issues the seed, the browser sends only the list of swaps it made, and this module
replays them with the SAME rules and the SAME random generator; the score is whatever the replay produces, so a player cannot invent a score. `tests/test_play_zone_verify.py` replays fixtures
recorded from the JavaScript engine (backend/tests/fixtures/play_zone_fixtures.json) and requires identical results, so a change to either engine that breaks the match is caught.
Keep the ORDER of every loop and random draw identical to the JavaScript: it is what makes the two engines agree.
"""

from __future__ import annotations

COLS = ROWS = 8
GEM_TYPES = 6
SCORE = {"match3": 30, "match4": 60, "match5": 100, "combo": 150, "complete": 200, "perMoveLeft": 20, "perEffectCrystal": 10, "overlapExtra": 10, "cascade": 30}
M32 = 0xFFFFFFFF


def _i32(x: int) -> int:
    x &= M32
    return x - 0x100000000 if x & 0x80000000 else x


def _imul(a: int, b: int) -> int:
    return _i32((a & M32) * (b & M32))


def rand(state: dict) -> float:
    state["seed"] = _i32(state["seed"] + 0x6D2B79F5)
    seed = state["seed"]
    t = _imul(seed ^ ((seed & M32) >> 15), 1 | seed)
    t = _i32(t + _imul(t ^ ((t & M32) >> 7), 61 | t)) ^ t
    t = _i32(t)
    return (((t ^ ((t & M32) >> 14)) & M32)) / 4294967296


def rand_int(state: dict, n: int) -> int:
    return int(rand(state) * n)


def key(r: int, c: int) -> int:
    return r * COLS + c


def inside(r: int, c: int) -> bool:
    return 0 <= r < ROWS and 0 <= c < COLS


def new_tile(state: dict, **props) -> dict:
    tile = {"id": state["next_id"], "kind": "gem", "color": 0, "special": None, "hp": 0}
    state["next_id"] += 1
    tile.update(props)
    return tile


def is_gem(t) -> bool:
    return bool(t) and t["kind"] == "gem"


def color_of(t) -> int:
    return t["color"] if is_gem(t) and t["special"] != "rainbow" else -1


def create_game(level: dict, seed: int = 1) -> dict:
    s = {
        "level": level, "seed": _i32(seed), "next_id": 1, "board": [[None] * COLS for _ in range(ROWS)], "ice": [[0] * COLS for _ in range(ROWS)], "moves": level["moves"], "score": 0,
        "status": "playing", "colors": level.get("colors") or GEM_TYPES,
        "progress": {"collect": [0] * GEM_TYPES, "ice": 0, "treasure": 0, "blocks": 0, "special": 0, "combos": 0, "bestChain": 0, "rainbow": 0},
        "totals": {"ice": 0, "blocks": 0, "treasure": 0}, "move_count": 0, "last_bonus": None,
    }
    for cell in level.get("ice") or []:
        r, c, layers = cell[0], cell[1], (cell[2] if len(cell) > 2 else 1)
        s["ice"][r][c] = layers; s["totals"]["ice"] += layers
    generate_board(s)
    return s


def _fill_colors(s: dict) -> None:
    b = s["board"]
    for r in range(ROWS):
        for c in range(COLS):
            if b[r][c]:
                continue
            guard = 0
            while True:
                color = rand_int(s, s["colors"]); guard += 1
                bad = (c >= 2 and color_of(b[r][c - 1]) == color and color_of(b[r][c - 2]) == color) or (r >= 2 and color_of(b[r - 1][c]) == color and color_of(b[r - 2][c]) == color)
                if not (guard < 30 and bad):
                    break
            b[r][c] = new_tile(s, color=color)


def generate_board(s: dict) -> None:
    level = s["level"]
    for _ in range(200):
        s["board"] = [[None] * COLS for _ in range(ROWS)]
        s["totals"]["blocks"] = 0; s["totals"]["treasure"] = 0
        for cell in level.get("blocks") or []:
            r, c, hp = cell[0], cell[1], (cell[2] if len(cell) > 2 else 1)
            s["board"][r][c] = new_tile(s, kind="block", color=-1, hp=hp); s["totals"]["blocks"] += 1
        for cell in level.get("treasures") or []:
            s["board"][cell[0]][cell[1]] = new_tile(s, kind="treasure", color=-1); s["totals"]["treasure"] += 1
        _fill_colors(s)
        for r, c, special in level.get("specials") or []:
            s["board"][r][c] = new_tile(s, color=-1 if special == "rainbow" else s["board"][r][c]["color"], special=special)
        if not find_runs(s["board"]) and has_valid_move(s):
            return
    raise ValueError(f"Could not generate a valid board for level {level['id']}")


def find_runs(board: list) -> list[dict]:
    runs = []
    for r in range(ROWS):
        c = 0
        while c < COLS:
            col = color_of(board[r][c]); e = c + 1
            while col >= 0 and e < COLS and color_of(board[r][e]) == col:
                e += 1
            if col >= 0 and e - c >= 3:
                runs.append({"dir": "h", "color": col, "cells": [[r, c + i] for i in range(e - c)]})
            c = max(e, c + 1)
    for c in range(COLS):
        r = 0
        while r < ROWS:
            col = color_of(board[r][c]); e = r + 1
            while col >= 0 and e < ROWS and color_of(board[e][c]) == col:
                e += 1
            if col >= 0 and e - r >= 3:
                runs.append({"dir": "v", "color": col, "cells": [[r + i, c] for i in range(e - r)]})
            r = max(e, r + 1)
    return runs


def group_runs(runs: list[dict]) -> list[dict]:
    parent = list(range(len(runs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i

    owner: dict[int, int] = {}
    for i, run in enumerate(runs):
        for r, c in run["cells"]:
            k = key(r, c)
            if k in owner:
                parent[find(i)] = find(owner[k])
            else:
                owner[k] = i
    groups: dict[int, list] = {}
    order = []
    for i, run in enumerate(runs):
        g = find(i)
        if g not in groups:
            groups[g] = []; order.append(g)
        groups[g].append(run)
    out = []
    for g in order:
        rs = groups[g]
        cells: dict[int, list] = {}
        for run in rs:
            for r, c in run["cells"]:
                cells[key(r, c)] = [r, c]
        lst = sorted(cells.values(), key=lambda p: (p[0], p[1]))
        out.append({"runs": rs, "color": rs[0]["color"], "cells": lst, "maxRun": max(len(x["cells"]) for x in rs), "cross": any(x["dir"] == "h" for x in rs) and any(x["dir"] == "v" for x in rs)})
    out.sort(key=lambda g: (g["cells"][0][0], g["cells"][0][1]))
    return out


def base_score(n: int) -> int:
    return SCORE["match5"] if n >= 5 else SCORE["match4"] if n == 4 else SCORE["match3"]


def special_for(group: dict, focus: list):
    special = None
    if group["maxRun"] >= 5:
        special = "rainbow"
    elif group["cross"]:
        special = "bomb"
    elif group["maxRun"] == 4:
        four = next(x for x in group["runs"] if len(x["cells"]) == 4)
        special = "rocketH" if four["dir"] == "h" else "rocketV"
    if not special:
        return None
    at = None
    for f in focus or []:
        if any(r == f[0] and c == f[1] for r, c in group["cells"]):
            at = f; break
    if at is None:
        if group["cross"]:
            hs = {key(r, c) for x in group["runs"] if x["dir"] == "h" for r, c in x["cells"]}
            at = next(([r, c] for x in group["runs"] if x["dir"] == "v" for r, c in x["cells"] if key(r, c) in hs), None)
        else:
            longest = group["runs"][0]
            for x in group["runs"]:
                if len(x["cells"]) > len(longest["cells"]):
                    longest = x
            at = longest["cells"][len(longest["cells"]) // 2]
    return {"special": special, "at": at}


def _swappable(t) -> bool:
    return bool(t) and t["kind"] != "block"


def _is_rocket(t) -> bool:
    return bool(t) and t["special"] in ("rocketH", "rocketV")


def is_valid_swap(s: dict, a, b) -> bool:
    r1, c1 = a; r2, c2 = b
    if not inside(r1, c1) or not inside(r2, c2) or abs(r1 - r2) + abs(c1 - c2) != 1:
        return False
    B = s["board"]; t1 = B[r1][c1]; t2 = B[r2][c2]
    if not _swappable(t1) or not _swappable(t2):
        return False
    if is_gem(t1) and is_gem(t2) and (t1["special"] == "rainbow" or t2["special"] == "rainbow"):
        return True
    if is_gem(t1) and is_gem(t2) and t1["special"] and t2["special"]:
        return True
    B[r1][c1] = t2; B[r2][c2] = t1
    ok = len(find_runs(B)) > 0
    B[r1][c1] = t1; B[r2][c2] = t2
    return ok


def has_valid_move(s: dict) -> bool:
    for r in range(ROWS):
        for c in range(COLS):
            if c + 1 < COLS and is_valid_swap(s, [r, c], [r, c + 1]):
                return True
            if r + 1 < ROWS and is_valid_swap(s, [r, c], [r + 1, c]):
                return True
    return False


def valid_moves(s: dict) -> list:
    out = []
    for r in range(ROWS):
        for c in range(COLS):
            if c + 1 < COLS and is_valid_swap(s, [r, c], [r, c + 1]):
                out.append([[r, c], [r, c + 1]])
            if r + 1 < ROWS and is_valid_swap(s, [r, c], [r + 1, c]):
                out.append([[r, c], [r + 1, c]])
    return out


def _add_row(st: set, r: int) -> None:
    for c in range(COLS):
        st.add(key(r, c))


def _add_col(st: set, c: int) -> None:
    for r in range(ROWS):
        st.add(key(r, c))


def _add_area(st: set, r: int, c: int, radius: int) -> None:
    for y in range(r - radius, r + radius + 1):
        for x in range(c - radius, c + radius + 1):
            if inside(y, x):
                st.add(key(y, x))


def _most_common_color(board: list) -> int:
    n = [0] * GEM_TYPES
    for row in board:
        for t in row:
            if is_gem(t) and t["color"] >= 0:
                n[t["color"]] += 1
    best = 0
    for i in range(1, GEM_TYPES):
        if n[i] > n[best]:
            best = i
    return best


def _expand(s: dict, st: set, effects: list, triggered: set) -> None:
    B = s["board"]
    queue = sorted(st)
    seen: set = set()
    while queue:
        k = queue.pop(0)
        if k in seen:
            continue
        seen.add(k)
        r, c = divmod(k, COLS)
        t = B[r][c]
        if not is_gem(t) or not t["special"] or t["id"] in triggered:
            continue
        triggered.add(t["id"])
        add: set = set()
        if t["special"] == "rocketH":
            _add_row(add, r); effects.append({"kind": "rocketH"})
        elif t["special"] == "rocketV":
            _add_col(add, c); effects.append({"kind": "rocketV"})
        elif t["special"] == "bomb":
            _add_area(add, r, c, 1); effects.append({"kind": "bomb"})
        elif t["special"] == "rainbow":
            color = _most_common_color(B)
            for y in range(ROWS):
                for x in range(COLS):
                    if is_gem(B[y][x]) and B[y][x]["color"] == color:
                        add.add(key(y, x))
            effects.append({"kind": "rainbow"})
        for q in add:
            if q not in st:
                st.add(q); queue.append(q)
        queue.sort()


def _combo_for(s: dict, a, b):
    B = s["board"]
    t1 = B[a[0]][a[1]]; t2 = B[b[0]][b[1]]
    if not is_gem(t1) or not is_gem(t2):
        return None
    st: set = set(); effects: list = []
    r, c = b
    if t1["special"] == "rainbow" and t2["special"] == "rainbow":
        for y in range(ROWS):
            _add_row(st, y)
        effects.append({"kind": "rainbow"})
        return {"set": st, "effects": effects, "label": "Double rainbow!"}
    rain = t1 if t1["special"] == "rainbow" else t2 if t2["special"] == "rainbow" else None
    if rain is not None:
        other = t2 if rain is t1 else t1
        rr, rc = a if rain is t1 else b
        if other["special"]:
            n = 0
            for y in range(ROWS):
                for x in range(COLS):
                    t = B[y][x]
                    if is_gem(t) and not t["special"] and t["color"] == other["color"]:
                        t["special"] = "bomb" if other["special"] == "bomb" else ("rocketV" if n % 2 else "rocketH"); n += 1
                        st.add(key(y, x))
            st.add(key(rr, rc)); st.add(key(*(a if other is t1 else b)))
            effects.append({"kind": "rainbow"})
            return {"set": st, "effects": effects, "label": "Rainbow power-up!"}
        for y in range(ROWS):
            for x in range(COLS):
                if is_gem(B[y][x]) and B[y][x]["color"] == other["color"]:
                    st.add(key(y, x))
        st.add(key(rr, rc))
        effects.append({"kind": "rainbow"})
        return {"set": st, "effects": effects, "label": "Rainbow burst!"}
    if t1["special"] and t2["special"]:
        if _is_rocket(t1) and _is_rocket(t2):
            _add_row(st, r); _add_col(st, c); effects.extend([{"kind": "rocketH"}, {"kind": "rocketV"}])
            return {"set": st, "effects": effects, "label": "Double rocket!"}
        if t1["special"] == "bomb" and t2["special"] == "bomb":
            _add_area(st, r, c, 2); effects.append({"kind": "bomb"})
            return {"set": st, "effects": effects, "label": "Mega bomb!"}
        for d in (-1, 0, 1):
            if 0 <= r + d < ROWS:
                _add_row(st, r + d)
            if 0 <= c + d < COLS:
                _add_col(st, c + d)
        effects.extend([{"kind": "rocketH"}, {"kind": "rocketV"}])
        return {"set": st, "effects": effects, "label": "Rocket bomb!"}
    return None


def _clear_cells(s: dict, st: set, created_at: list) -> dict:
    B = s["board"]; p = s["progress"]
    cleared = []; broken = 0
    for k in sorted(st):
        r, c = divmod(k, COLS)
        t = B[r][c]
        if not t:
            continue
        if t["kind"] == "treasure":
            continue
        if t["kind"] == "block":
            t["hp"] -= 1
            if t["hp"] <= 0:
                B[r][c] = None; broken += 1; p["blocks"] += 1
            continue
        if t["color"] >= 0:
            p["collect"][t["color"]] += 1
        if t["special"]:
            p["special"] += 1
            if t["special"] == "rainbow":
                p["rainbow"] += 1
        cleared.append((r, c, t))
        B[r][c] = None
        if s["ice"][r][c] > 0:
            s["ice"][r][c] -= 1; p["ice"] += 1
    neighbours = set()
    for r, c, _t in cleared:
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if inside(r + dr, c + dc):
                neighbours.add(key(r + dr, c + dc))
    for k in sorted(neighbours):
        r, c = divmod(k, COLS)
        t = B[r][c]
        if not t or t["kind"] != "block":
            continue
        t["hp"] -= 1
        if t["hp"] <= 0:
            B[r][c] = None; p["blocks"] += 1
    for cr in created_at:
        B[cr["r"]][cr["c"]] = new_tile(s, color=-1 if cr["special"] == "rainbow" else cr["color"], special=cr["special"])
    return {"cleared": len(cleared)}


def _gravity(s: dict) -> None:
    B = s["board"]
    for c in range(COLS):
        write = ROWS - 1
        for r in range(ROWS - 1, -1, -1):
            t = B[r][c]
            if not t:
                continue
            if r != write:
                B[write][c] = t; B[r][c] = None
            write -= 1
        empty = write + 1
        for r in range(empty - 1, -1, -1):
            B[r][c] = new_tile(s, color=rand_int(s, s["colors"]))


def _collect_treasure(s: dict) -> int:
    n = 0
    for c in range(COLS):
        t = s["board"][ROWS - 1][c]
        if t and t["kind"] == "treasure":
            s["board"][ROWS - 1][c] = None; s["progress"]["treasure"] += 1; n += 1
    return n


def reshuffle(s: dict) -> bool:
    B = s["board"]
    cells = [[r, c] for r in range(ROWS) for c in range(COLS) if is_gem(B[r][c]) and not B[r][c]["special"]]
    tiles = [B[r][c] for r, c in cells]
    for _ in range(80):
        for i in range(len(tiles) - 1, 0, -1):
            j = rand_int(s, i + 1)
            tiles[i], tiles[j] = tiles[j], tiles[i]
        for i, (r, c) in enumerate(cells):
            B[r][c] = tiles[i]
        if not find_runs(B) and has_valid_move(s):
            return True
    for _ in range(200):
        for r, c in cells:
            B[r][c] = None
        for i, (r, c) in enumerate(cells):
            guard = 0
            while True:
                color = rand_int(s, s["colors"]); guard += 1
                bad = (c >= 2 and color_of(B[r][c - 1]) == color and color_of(B[r][c - 2]) == color) or (r >= 2 and color_of(B[r - 1][c]) == color and color_of(B[r - 2][c]) == color)
                if not (guard < 30 and bad):
                    break
            B[r][c] = tiles[i]; tiles[i]["color"] = color
        if not find_runs(B) and has_valid_move(s):
            return True
    return False


def objective_status(s: dict) -> list[dict]:
    p = s["progress"]; out = []
    for o in s["level"].get("objectives") or []:
        t = o["type"]; current = 0; target = 1
        if t == "score":
            current = s["score"] - (s["last_bonus"]["total"] if s["last_bonus"] else 0); target = o["target"]
        elif t == "collect":
            current = p["collect"][o["color"]]; target = o["count"]
        elif t == "ice":
            current = p["ice"]; target = s["totals"]["ice"]
        elif t == "treasure":
            current = p["treasure"]; target = o.get("count", s["totals"]["treasure"])
        elif t == "blocks":
            current = p["blocks"]; target = o.get("count", s["totals"]["blocks"])
        elif t == "special":
            current = p["special"]; target = o["count"]
        elif t == "combos":
            current = p["combos"]; target = o["count"]
        elif t == "chain":
            current = p["bestChain"]; target = o["size"]
        elif t == "rainbow":
            current = p["rainbow"]; target = o["count"]
        out.append({**o, "current": min(current, target), "target": target, "done": current >= target})
    return out


def objectives_met(s: dict) -> bool:
    return all(o["done"] for o in objective_status(s))


def play_move(s: dict, a, b) -> bool:
    """Play one move exactly like the JavaScript engine. Returns False (and changes nothing) for an invalid move."""
    if s["status"] != "playing" or s["moves"] <= 0 or not is_valid_swap(s, a, b):
        return False
    B = s["board"]
    t1 = B[a[0]][a[1]]; t2 = B[b[0]][b[1]]
    B[a[0]][a[1]] = t2; B[b[0]][b[1]] = t1
    s["moves"] -= 1; s["move_count"] += 1
    chain = 0; first = True; triggered: set = set()
    while True:
        st = None; effects: list = []; created: list = []; points = 0; combo = False; groups_out: list = []
        if first:
            first = False
            cb = _combo_for(s, a, b)
            if cb:
                st = cb["set"]; effects = cb["effects"]; combo = True
                points += SCORE["combo"]; s["progress"]["combos"] += 1
                _expand(s, st, effects, triggered)
        if st is None:
            runs = find_runs(B)
            if not runs:
                break
            groups = group_runs(runs)
            st = set()
            for g in groups:
                for r, c in g["cells"]:
                    st.add(key(r, c))
                pts = base_score(g["maxRun"]) + SCORE["overlapExtra"] * (len(g["cells"]) - g["maxRun"])
                points += pts
                sp = special_for(g, [b, a] if chain == 0 else [])
                if sp:
                    created.append({"r": sp["at"][0], "c": sp["at"][1], "color": g["color"], "special": sp["special"]})
                groups_out.append({"cells": len(g["cells"]), "points": pts})
            _expand(s, st, effects, triggered)
        chain += 1
        if chain > 1:
            points += SCORE["cascade"] * (chain - 1)
        crystals_hit = 0
        for k in st:
            r, c = divmod(k, COLS)
            if is_gem(B[r][c]):
                crystals_hit += 1
        matched = sum(g["cells"] for g in groups_out)
        if effects:
            points += SCORE["perEffectCrystal"] * max(0, crystals_hit - matched)
        s["progress"]["bestChain"] = max(s["progress"]["bestChain"], chain)
        _clear_cells(s, st, created)
        s["score"] += points
        for _ in range(8):
            _gravity(s)
            if not _collect_treasure(s):
                break
    if not has_valid_move(s):
        reshuffle(s)
    if objectives_met(s):
        bonus = {"complete": SCORE["complete"], "moves": s["moves"] * SCORE["perMoveLeft"], "movesLeft": s["moves"]}
        bonus["total"] = bonus["complete"] + bonus["moves"]
        s["last_bonus"] = bonus; s["score"] += bonus["total"]; s["status"] = "won"
    elif s["moves"] <= 0:
        s["status"] = "failed"
    return True


def stars_for(s: dict) -> int:
    if s["status"] != "won":
        return 0
    left = s["moves"] / s["level"]["moves"]
    return 3 if left >= 0.5 else 2 if left >= 0.25 else 1

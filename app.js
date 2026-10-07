/* COACHING-L 人生の輪
   入力した内容は、参加者の端末（ブラウザ）の中にだけ保存します。どこにも送信しません。 */
(function () {
  "use strict";

  /* ===== 設定（領域の名前や説明を変えるときは、ここを書き換えます）===== */
  var SETTINGS = {
    // 問いカードの公開URL（「いちばん変えたい領域」の問いカードを開くボタンで使います）
    cardsUrl: "https://coaching-l.github.io/reflection-cards/",
    // 8つの領域（輪の真上から時計回りの順）
    //   name：名前　note：補足（画面では小さく表示）　cat：問いカードの ?cat= に使うID
    //   color：色（ブログの「人生の輪」ツール・問いカードと同じ）　desc：「？」で開く説明
    items: [
      {
        name: "心身の健康",
        note: "",
        cat: "health",
        color: "#D9775B",
        desc: "体の調子、睡眠、食事、運動、ストレスとのつき合い方、気持ちの安定など。"
      },
      {
        name: "仕事・キャリア",
        note: "",
        cat: "career",
        color: "#DE9F4E",
        desc: "いまの仕事の内容ややりがい、働き方、職場での役割、これからのキャリアの見通しなど。"
      },
      {
        name: "自己成長",
        note: "学びや自己啓発など",
        cat: "growth",
        color: "#BFAE45",
        desc: "新しい知識やスキルを学ぶこと、読書や資格の勉強、自分を高めるための時間や取り組みなど。"
      },
      {
        name: "遊び・余暇",
        note: "",
        cat: "play",
        color: "#7EA26A",
        desc: "趣味、休日の過ごし方、楽しみや息抜きの時間、心からリラックスできる時間など。"
      },
      {
        name: "人間関係",
        note: "",
        cat: "relationships",
        color: "#4E9993",
        desc: "友人、職場の仲間、地域や趣味のつながりなど、家族以外の人との関係。"
      },
      {
        name: "物理的環境",
        note: "居住環境など",
        cat: "environment",
        color: "#5A85B7",
        desc: "住まいや部屋、職場の環境、身の回りの持ち物、暮らしている地域など、自分を取り巻く環境。"
      },
      {
        name: "家族・パートナー",
        note: "",
        cat: "family",
        color: "#8B76B4",
        desc: "家族やパートナーとの関係、一緒に過ごす時間、家庭での役割など。パートナーがいない方は、いまの状態への満足度で考えてみてください。"
      },
      {
        name: "お金・財務",
        note: "",
        cat: "money",
        color: "#C06C99",
        desc: "収入と支出のバランス、貯蓄や資産、将来へのお金の備え、お金についての安心感など。"
      }
    ]
  };
  /* ===== 設定ここまで ===== */

  // 端末のブラウザに保存するときの名前。保存する中身の形を変えたら、末尾の数字を上げる
  var STORAGE_KEY = "coaching-l.wheel-of-life.v1";
  var MAX = 10;
  var NS = "http://www.w3.org/2000/svg";
  var MODE_NAMES = { now: "いま", ideal: "理想" };
  // 画像の文字（端末に入っている日本語フォントを使う）
  var FONT = "'Hiragino Sans','Hiragino Kaku Gothic ProN','Noto Sans JP','Yu Gothic','Meiryo',sans-serif";
  // 画像の色（画面のダークモードに関係なく、明るい配色で作る）
  var INK = {
    heading: "#042143",
    text: "#293746",
    muted: "#5f6d7c",
    gold: "#c09e5c",
    goldText: "#8a6c34",
    line: "#e0e5ea"
  };
  // 行頭に来ないようにする文字（画像の中の折り返しで使う）
  var NO_LINE_START = "、。，．,.)）」』】〉》！？!?・ー…～ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ";

  var items = SETTINGS.items;
  var n = items.length;
  var step = (Math.PI * 2) / n;
  // 画面のグラフの大きさ（SVG の座標）
  var CHART = { w: 520, h: 460, cx: 260, cy: 230, r: 150 };

  var els = {
    name: byId("name-input"),
    modeButtons: Array.prototype.slice.call(document.querySelectorAll(".mode-button")),
    countNow: byId("count-now"),
    countIdeal: byId("count-ideal"),
    modeLead: byId("mode-lead"),
    rate: byId("rate"),
    items: byId("items"),
    nextStep: byId("next-step"),
    nextStepText: byId("next-step-text"),
    nextStepButton: byId("next-step-button"),
    result: byId("result"),
    progress: byId("progress"),
    chart: byId("chart"),
    avg: byId("avg"),
    summary: byId("summary"),
    summaryList: byId("summary-list"),
    insight: byId("note-insight"),
    firstStep: byId("note-step"),
    focusList: byId("focus-list"),
    cardsLink: byId("cards-link"),
    cardsLinkButton: byId("cards-link-button"),
    download: byId("download-button"),
    msg: byId("msg"),
    reset: byId("reset-button"),
    preview: byId("preview"),
    previewImage: byId("preview-image"),
    previewClose: byId("preview-close")
  };

  var state = load() || emptyState();

  var rows = []; // 領域ごとの点数ボタン
  var focusButtons = [];
  var wedges = [];
  var scoreLabels = [];
  var idealLine = null;
  var svg = null;
  var nextAction = null;

  var cardBlob = null; // ダウンロードする画像（先に作っておく）
  var cardTimer = null;
  var logo = null;

  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // LINE・Instagram などのアプリの中のブラウザ（ダウンロードできないことが多い）
  var isInAppBrowser = /\bLine\/|FBAN|FBAV|Instagram|KAKAOTALK|; wv\)/.test(ua);

  var reducedMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  /* ---------- 小さな道具 ---------- */

  function byId(id) {
    return document.getElementById(id);
  }

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  function hexToRgba(hex, alpha) {
    var v = parseInt(hex.replace("#", ""), 16);
    return "rgba(" + ((v >> 16) & 255) + ", " + ((v >> 8) & 255) + ", " + (v & 255) + ", " + alpha + ")";
  }

  function zeros() {
    return items.map(function () {
      return 0;
    });
  }

  function fullName(i) {
    return items[i].name + (items[i].note ? "（" + items[i].note + "）" : "");
  }

  function scrollBehavior() {
    return reducedMotionQuery && reducedMotionQuery.matches ? "auto" : "smooth";
  }

  function count(mode) {
    return state[mode].filter(function (v) {
      return v > 0;
    }).length;
  }

  function isComplete(mode) {
    return count(mode) === n;
  }

  function average(mode) {
    var sum = state[mode].reduce(function (a, b) {
      return a + b;
    }, 0);
    return (Math.round((sum / n) * 10) / 10).toFixed(1);
  }

  /* ---------- 端末への保存（localStorage。送信はしない） ---------- */

  function emptyState() {
    return { name: "", now: zeros(), ideal: zeros(), insight: "", firstStep: "", focus: -1, mode: "now" };
  }

  function validScores(list) {
    return items.map(function (_, i) {
      var v = list && list[i];
      return typeof v === "number" && v % 1 === 0 && v >= 1 && v <= MAX ? v : 0;
    });
  }

  function text(value, max) {
    return typeof value === "string" ? value.slice(0, max) : "";
  }

  function itemKey() {
    return items
      .map(function (it) {
        return it.name;
      })
      .join("|");
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      // 設定の領域が変わっていたら、前の点数は使わない
      if (!d || d.items !== itemKey()) return null;
      var s = emptyState();
      s.name = text(d.name, 30);
      s.now = validScores(d.now);
      s.ideal = validScores(d.ideal);
      s.insight = text(d.insight, 200);
      s.firstStep = text(d.firstStep, 200);
      if (typeof d.focus === "number" && d.focus % 1 === 0 && d.focus >= 0 && d.focus < n) s.focus = d.focus;
      if (d.mode === "ideal") s.mode = "ideal";
      return s;
    } catch (e) {
      return null;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items: itemKey(),
          name: state.name,
          now: state.now,
          ideal: state.ideal,
          insight: state.insight,
          firstStep: state.firstStep,
          focus: state.focus,
          mode: state.mode
        })
      );
    } catch (e) {
      // 保存できない設定のブラウザ（プライベートブラウズなど）では、保存せずにそのまま使う
    }
  }

  function clearSaved() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // 何もしない
    }
  }

  /* ---------- STEP 1：領域ごとの 1〜10 のボタン ---------- */

  function buildItems() {
    items.forEach(function (it, i) {
      var row = mk("div", "item");
      row.style.setProperty("--c", it.color);
      row.style.setProperty("--c-soft", hexToRgba(it.color, 0.24));

      var head = mk("div", "item-head");
      head.appendChild(mk("span", "item-dot"));
      var nameEl = mk("span", "item-name", it.name);
      if (it.note) nameEl.appendChild(mk("span", "item-note", "（" + it.note + "）"));
      head.appendChild(nameEl);

      var desc = mk("p", "item-desc", it.desc);
      desc.id = "item-desc-" + i;
      desc.hidden = true;

      var info = mk("button", "info-button", "?");
      info.type = "button";
      info.setAttribute("aria-expanded", "false");
      info.setAttribute("aria-controls", desc.id);
      info.setAttribute("aria-label", it.name + "の説明");
      info.addEventListener("click", function () {
        var open = desc.hidden;
        desc.hidden = !open;
        info.setAttribute("aria-expanded", open ? "true" : "false");
      });
      head.appendChild(info);

      var score = mk("span", "item-score");
      head.appendChild(score);

      var scale = mk("div", "scale");
      scale.setAttribute("role", "group");
      var btns = [];
      for (var v = 1; v <= MAX; v++) {
        (function (v) {
          var b = mk("button", "scale-button", String(v));
          b.type = "button";
          b.addEventListener("click", function () {
            setScore(i, v);
          });
          scale.appendChild(b);
          btns.push(b);
        })(v);
      }

      row.appendChild(head);
      row.appendChild(desc);
      row.appendChild(scale);
      els.items.appendChild(row);
      rows.push({ row: row, score: score, scale: scale, btns: btns });
    });
  }

  function renderMode() {
    els.modeButtons.forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-mode") === state.mode ? "true" : "false");
    });
    els.countNow.textContent = count("now") + "/" + n;
    els.countIdeal.textContent = count("ideal") + "/" + n;
    els.modeLead.textContent =
      state.mode === "now"
        ? "いまの満足度を、1〜10点で選んでください。深く考えすぎず、直感で大丈夫です。"
        : "「こうなっていたら最高」と思える理想の点数を選んでください。数字の下の「いま」は、いまの点数です。";
  }

  function renderItems() {
    var mode = state.mode;
    var other = mode === "now" ? "ideal" : "now";
    rows.forEach(function (r, i) {
      var v = state[mode][i];
      var o = state[other][i];
      r.btns.forEach(function (b, j) {
        var num = j + 1;
        b.classList.toggle("is-fill", num < v);
        b.classList.toggle("is-on", num === v);
        b.setAttribute("aria-pressed", num === v ? "true" : "false");
        b.setAttribute(
          "aria-label",
          items[i].name + " " + MODE_NAMES[mode] + "の点数 " + num + "点" + (num === o ? "（" + MODE_NAMES[other] + "の点数）" : "")
        );
        if (num === o) b.setAttribute("data-mark", MODE_NAMES[other]);
        else b.removeAttribute("data-mark");
      });
      r.scale.classList.toggle("has-mark", o > 0);
      r.scale.setAttribute("aria-label", fullName(i) + "の" + MODE_NAMES[mode] + "の点数");
      r.score.textContent = v ? MODE_NAMES[mode] + " " + v + "点" : "未選択";
      r.score.classList.toggle("is-set", v > 0);
    });
  }

  function renderNextStep() {
    var nowDone = isComplete("now");
    var idealDone = isComplete("ideal");
    var t = "";
    var label = "";
    nextAction = null;
    if (state.mode === "now" && nowDone && !idealDone) {
      t = "いまの点数がそろいました。次は、理想の点数を選んでみましょう。";
      label = "理想の点数を選ぶ";
      nextAction = "ideal";
    } else if (state.mode === "ideal" && idealDone && !nowDone) {
      t = "いまの点数に、まだ選んでいない領域があります。";
      label = "いまの点数を選ぶ";
      nextAction = "now";
    } else if (nowDone && idealDone) {
      t = "いまと理想の点数がそろいました。輪を見て、差を確かめてみましょう。";
      label = "人生の輪を見る";
      nextAction = "result";
    }
    els.nextStep.hidden = !nextAction;
    els.nextStepText.textContent = t;
    els.nextStepButton.textContent = label;
  }

  function setScore(i, v) {
    state[state.mode][i] = v;
    if (state.mode === "now") rows[i].row.classList.remove("is-missing");
    showMsg("");
    update();
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    rows.forEach(function (r) {
      r.row.classList.remove("is-missing");
    });
    update();
  }

  /* ---------- STEP 2：人生の輪のグラフ（画面用） ---------- */

  function angle0(i) {
    return -Math.PI / 2 + i * step;
  }

  function labelAngle(i) {
    return -Math.PI / 2 + (i + 0.5) * step;
  }

  function pt(ox, oy, r, a) {
    return [ox + r * Math.cos(a), oy + r * Math.sin(a)];
  }

  function f2(x) {
    return x.toFixed(2);
  }

  function wedgePath(ox, oy, r, a0, a1) {
    var p0 = pt(ox, oy, r, a0);
    var p1 = pt(ox, oy, r, a1);
    return "M" + ox + " " + oy + " L" + f2(p0[0]) + " " + f2(p0[1]) +
      " A" + r + " " + r + " 0 0 1 " + f2(p1[0]) + " " + f2(p1[1]) + " Z";
  }

  /* 理想の点数の点線（画面と画像で共通）。となり合う領域どうしは、境目の線でつなぐ */
  function idealPathData(ox, oy, OR) {
    var d = "";
    var open = false;
    for (var i = 0; i < n; i++) {
      var v = state.ideal[i];
      if (!v) {
        open = false;
        continue;
      }
      var r = (OR * v) / MAX;
      var p0 = pt(ox, oy, r, angle0(i));
      var p1 = pt(ox, oy, r, angle0(i) + step);
      d += (open ? " L" : " M") + f2(p0[0]) + " " + f2(p0[1]) +
        " A" + f2(r) + " " + f2(r) + " 0 0 1 " + f2(p1[0]) + " " + f2(p1[1]);
      open = true;
    }
    // 最後の領域と最初の領域をつなぐ
    if (open && state.ideal[0] && n > 1) {
      var first = pt(ox, oy, (OR * state.ideal[0]) / MAX, angle0(0));
      d += " L" + f2(first[0]) + " " + f2(first[1]);
    }
    return d.trim();
  }

  /* グラフのラベルの改行（長いものだけ「・」の後ろで折り返す） */
  function splitLabel(s) {
    if (s.length <= 5) return [s];
    var out = [];
    var parts = s.split("・");
    parts.forEach(function (t, j) {
      var piece = j < parts.length - 1 ? t + "・" : t;
      while (piece.length > 6) {
        out.push(piece.slice(0, 6));
        piece = piece.slice(6);
      }
      if (piece) out.push(piece);
    });
    return out;
  }

  function splitNote(note) {
    if (!note) return [];
    note = "（" + note + "）";
    if (note.length <= 8) return [note];
    var k = note.indexOf("や");
    var cut = k > 0 ? k + 1 : Math.ceil(note.length / 2);
    return [note.slice(0, cut), note.slice(cut)];
  }

  /* ラベル1つ分の行（名前・補足・点数） */
  function labelLines(i, size) {
    var out = [];
    splitLabel(items[i].name).forEach(function (t) {
      out.push({ t: t, kind: "name", size: size, h: size * 1.22 });
    });
    splitNote(items[i].note).forEach(function (t) {
      out.push({ t: t, kind: "note", size: size * 0.74, h: size * 0.74 * 1.3 });
    });
    out.push({ t: "", kind: "score", size: size + 1, h: size * 1.3 });
    return out;
  }

  /* ラベルの配置（画面・画像で共通）。各行の中心の高さを返す */
  function labelLayout(a, py, lines) {
    var cos = Math.cos(a);
    var sin = Math.sin(a);
    var total = lines.reduce(function (sum, l) {
      return sum + l.h;
    }, 0);
    var align = "center";
    var top;
    if (cos > 0.3) align = "left";
    if (cos < -0.3) align = "right";
    if (Math.abs(sin) > 0.85) top = sin < 0 ? py - total : py; // 上下のラベルは輪の外側へ積む
    else if (align !== "center") top = py - total / 2;
    else top = sin < 0 ? py - total : py;
    var ys = [];
    var y = top;
    lines.forEach(function (l) {
      ys.push(y + l.h / 2);
      y += l.h;
    });
    return { align: align, ys: ys };
  }

  function scoreText(i) {
    var v = state.now[i];
    var w = state.ideal[i];
    if (!w) return v ? v + "点" : "－";
    return (v || "－") + " → " + w + "点";
  }

  function buildChart() {
    var W = CHART.w;
    var H = CHART.h;
    var cx = CHART.cx;
    var cy = CHART.cy;
    var R = CHART.r;
    var small = window.matchMedia ? window.matchMedia("(max-width: 480px)").matches : false;
    var fs = small ? 18 : 14;

    svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img" });

    items.forEach(function (it, i) {
      svg.appendChild(svgEl("path", { d: wedgePath(cx, cy, R, angle0(i), angle0(i) + step), fill: it.color, "class": "wedge-bg" }));
    });
    items.forEach(function (it, i) {
      var w = svgEl("path", { d: wedgePath(cx, cy, R, angle0(i), angle0(i) + step), fill: it.color, "class": "wedge" });
      w.style.transformOrigin = cx + "px " + cy + "px";
      w.style.transform = "scale(0)";
      svg.appendChild(w);
      wedges.push(w);
    });
    for (var k = 1; k <= MAX; k++) {
      svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: (R * k) / MAX, "class": k === 5 ? "grid grid-mid" : "grid" }));
    }
    items.forEach(function (it, i) {
      var p = pt(cx, cy, R, angle0(i));
      svg.appendChild(svgEl("line", { x1: cx, y1: cy, x2: f2(p[0]), y2: f2(p[1]), "class": "grid" }));
    });
    svg.appendChild(svgEl("circle", { cx: cx, cy: cy, r: R, "class": "rim" }));

    idealLine = svgEl("path", { d: "", "class": "ideal-line" });
    svg.appendChild(idealLine);

    items.forEach(function (it, i) {
      var la = labelAngle(i);
      var p = pt(cx, cy, R + 16, la);
      var lines = labelLines(i, fs);
      var lay = labelLayout(la, p[1], lines);
      var anchor = lay.align === "left" ? "start" : lay.align === "right" ? "end" : "middle";
      var t = svgEl("text", { "text-anchor": anchor, "class": "lbl", "aria-hidden": "true" });
      lines.forEach(function (l, j) {
        var ts = svgEl("tspan", { x: f2(p[0]), y: f2(lay.ys[j]), "font-size": l.size.toFixed(1), "class": "lbl-" + l.kind });
        if (l.kind === "score") {
          ts.setAttribute("fill", it.color);
          scoreLabels.push(ts);
        } else {
          ts.textContent = l.t;
        }
        t.appendChild(ts);
      });
      svg.appendChild(t);
    });

    els.chart.appendChild(svg);
  }

  function renderChart() {
    wedges.forEach(function (w, i) {
      w.style.transform = "scale(" + state.now[i] / MAX + ")";
    });
    idealLine.setAttribute("d", idealPathData(CHART.cx, CHART.cy, CHART.r));
    scoreLabels.forEach(function (ts, i) {
      ts.textContent = scoreText(i);
    });
    svg.setAttribute(
      "aria-label",
      "人生の輪のグラフ。" +
        items
          .map(function (it, i) {
            return it.name + "、いま" + (state.now[i] ? state.now[i] + "点" : "未選択") +
              (state.ideal[i] ? "、理想" + state.ideal[i] + "点" : "");
          })
          .join("。")
    );
  }

  function renderResult() {
    var nowCount = count("now");
    var idealCount = count("ideal");
    var p = "";
    if (nowCount === 0) p = "「いまの点数」を選ぶと、ここに輪が描かれます";
    else if (nowCount < n) p = "いまの点数：あと " + (n - nowCount) + " 領域です";
    else if (idealCount === 0) p = "「理想の点数」を選ぶと、点線で重なります";
    else if (idealCount < n) p = "理想の点数：あと " + (n - idealCount) + " 領域です";
    els.progress.textContent = p;
    els.progress.hidden = !p;

    els.avg.textContent = "";
    if (nowCount === n) {
      els.avg.appendChild(mk("span", "phrase", "いまの平均 " + average("now") + "点"));
      if (idealCount === n) {
        els.avg.appendChild(document.createTextNode("　"));
        els.avg.appendChild(mk("span", "phrase", "理想の平均 " + average("ideal") + "点"));
      }
    }
  }

  /* ---------- ひとことまとめ（画面と画像で共通） ---------- */

  function namesOf(list) {
    return list
      .map(function (i) {
        return items[i].name;
      })
      .join("、");
  }

  function indexesOf(values, target) {
    var out = [];
    values.forEach(function (v, i) {
      if (v === target) out.push(i);
    });
    return out;
  }

  function summaryRows() {
    if (!isComplete("now")) return [];
    var out = [];
    var hi = Math.max.apply(null, state.now);
    var lo = Math.min.apply(null, state.now);
    if (hi === lo) {
      out.push({ label: "いまの点数", value: "すべての領域が同じ点数です", score: "（" + hi + "点）" });
    } else {
      out.push({ label: "いちばん高い領域", value: namesOf(indexesOf(state.now, hi)), score: "（" + hi + "点）" });
      out.push({ label: "いちばん低い領域", value: namesOf(indexesOf(state.now, lo)), score: "（" + lo + "点）" });
    }

    var gaps = state.now.map(function (v, i) {
      return state.ideal[i] ? state.ideal[i] - v : null;
    });
    var rated = gaps.filter(function (g) {
      return g !== null;
    });
    if (rated.length) {
      var maxGap = Math.max.apply(null, rated);
      if (maxGap > 0) {
        var top = indexesOf(gaps, maxGap);
        out.push({
          label: "理想との差がいちばん大きい領域",
          value: namesOf(top),
          score: top.length === 1
            ? "（" + state.now[top[0]] + "点 → " + state.ideal[top[0]] + "点）"
            : "（差 " + maxGap + "点）"
        });
      } else if (rated.length === n) {
        out.push({ label: "理想との差", value: "どの領域も、いまの点数が理想に届いています", score: "" });
      }
    }
    return out;
  }

  function renderSummary() {
    var list = summaryRows();
    els.summary.hidden = list.length === 0;
    els.summaryList.textContent = "";
    list.forEach(function (r) {
      var row = mk("div", "summary-row");
      row.appendChild(mk("dt", "", r.label));
      var dd = mk("dd", "", r.value);
      if (r.score) dd.appendChild(mk("span", "summary-score", r.score));
      row.appendChild(dd);
      els.summaryList.appendChild(row);
    });
  }

  /* ---------- STEP 3：いちばん変えたい領域と、問いカードへのリンク ---------- */

  function buildFocus() {
    items.forEach(function (it, i) {
      var b = mk("button", "focus-button", it.name);
      b.type = "button";
      b.style.setProperty("--c", it.color);
      b.addEventListener("click", function () {
        state.focus = state.focus === i ? -1 : i;
        update();
      });
      els.focusList.appendChild(b);
      focusButtons.push(b);
    });
  }

  function renderFocus() {
    focusButtons.forEach(function (b, i) {
      b.setAttribute("aria-pressed", state.focus === i ? "true" : "false");
    });
    var it = items[state.focus];
    els.cardsLink.hidden = !it;
    if (it) {
      els.cardsLinkButton.href = SETTINGS.cardsUrl + "?cat=" + encodeURIComponent(it.cat);
      els.cardsLinkButton.textContent = "「" + it.name + "」の問いカードを引く";
    }
  }

  /* ---------- 画面全体の更新 ---------- */

  function update() {
    renderMode();
    renderItems();
    renderNextStep();
    renderChart();
    renderResult();
    renderSummary();
    renderFocus();
    els.download.classList.toggle("is-locked", !isComplete("now"));
    save();
    scheduleCard();
  }

  function showMsg(t, ok) {
    els.msg.textContent = t;
    els.msg.classList.toggle("is-ok", !!ok);
  }

  /* ---------- STEP 4：保存する画像 ---------- */

  function pad(x) {
    return (x > 9 ? "" : "0") + x;
  }

  function ymd() {
    var d = new Date();
    return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function fmtDate(s) {
    return s.slice(0, 4) + "年" + Number(s.slice(4, 6)) + "月" + Number(s.slice(6, 8)) + "日";
  }

  function fileName() {
    var name = state.name.trim().replace(/[\s\\/:*?"<>|]/g, "");
    return "人生の輪_" + (name ? name + "_" : "") + ymd() + ".png";
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* 文字の間をあけて、中央にそろえて書く（COACHING-L のロゴ文字） */
  function spacedText(g, t, cx, y, spacing) {
    var chars = Array.from(t);
    var widths = chars.map(function (c) {
      return g.measureText(c).width;
    });
    var total = widths.reduce(function (a, b) {
      return a + b;
    }, 0) + spacing * (chars.length - 1);
    var x = cx - total / 2;
    g.textAlign = "left";
    chars.forEach(function (c, i) {
      g.fillText(c, x, y);
      x += widths[i] + spacing;
    });
  }

  /* 決まった幅で折り返す（日本語は1文字ずつ。句読点などは行頭に来ないようにする） */
  function wrapText(g, t, maxW) {
    var out = [];
    String(t).split(/\r?\n/).forEach(function (para) {
      var line = "";
      Array.from(para).forEach(function (ch) {
        if (line && g.measureText(line + ch).width > maxW && NO_LINE_START.indexOf(ch) < 0) {
          out.push(line);
          line = ch;
        } else {
          line += ch;
        }
      });
      out.push(line);
    });
    // 最後の空行は詰める
    while (out.length > 1 && !out[out.length - 1].trim()) out.pop();
    return out;
  }

  /* 見出し（小さな金色の文字）＋本文のまとまりを書いて、次の高さを返す */
  function drawBlock(g, x, y, maxW, label, body, opts) {
    g.textAlign = "left";
    g.fillStyle = INK.muted;
    g.font = "600 26px " + FONT;
    g.fillText(label, x, y + 16);
    y += 46;
    var dotted = opts && opts.dot;
    var bx = dotted ? x + 34 : x;
    g.font = (opts && opts.bold ? "700 " : "400 ") + "32px " + FONT;
    var lines = wrapText(g, body, maxW - (bx - x));
    if (dotted) {
      g.beginPath();
      g.arc(x + 12, y + 24, 11, 0, Math.PI * 2);
      g.fillStyle = opts.dot;
      g.fill();
    }
    g.fillStyle = opts && opts.bold ? INK.heading : INK.text;
    lines.forEach(function (l, j) {
      g.fillText(l, bx, y + 24 + j * 50);
    });
    return y + lines.length * 50 + 26;
  }

  function drawDivider(g, cw, y) {
    g.beginPath();
    g.moveTo(120, y);
    g.lineTo(cw - 120, y);
    g.strokeStyle = INK.line;
    g.lineWidth = 2;
    g.stroke();
  }

  function drawSectionTitle(g, t, y) {
    g.textAlign = "left";
    g.fillStyle = INK.goldText;
    g.font = "700 28px " + FONT;
    spacedTextLeft(g, t, 120, y, 4);
  }

  function spacedTextLeft(g, t, x, y, spacing) {
    g.textAlign = "left";
    Array.from(t).forEach(function (c) {
      g.fillText(c, x, y);
      x += g.measureText(c).width + spacing;
    });
  }

  /* 画像を描いて、中身の高さを返す。ch が 0 のときは、高さを測るだけ（背景・枠・フッターは描かない） */
  function paintCard(g, cw, ch) {
    var M = 120;
    var TW = cw - M * 2;
    var y;

    g.textBaseline = "middle";
    if (ch) {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, cw, ch);
      g.strokeStyle = INK.gold;
      g.lineWidth = 3;
      roundRect(g, 36, 36, cw - 72, ch - 72, 28);
      g.stroke();
    }

    // ヘッダー（ロゴ・COACHING-L・タイトル・名前と日付）
    y = 92;
    if (logo) {
      g.drawImage(logo, cw / 2 - 42, y, 84, 84);
      y += 84 + 38;
    } else {
      y += 24;
    }
    g.fillStyle = INK.heading;
    g.font = "700 28px " + FONT;
    spacedText(g, "COACHING-L", cw / 2, y, 7);
    y += 72;
    g.textAlign = "center";
    g.font = "700 68px " + FONT;
    g.fillText("人生の輪", cw / 2, y);
    y += 70;
    var name = state.name.trim();
    g.fillStyle = INK.muted;
    g.font = "400 30px " + FONT;
    g.fillText((name ? name + " さん　" : "") + fmtDate(ymd()), cw / 2, y);
    y += 40;

    // 人生の輪
    var OR = 285;
    var ox = cw / 2;
    var oy = y + 396;
    items.forEach(function (it, i) {
      g.beginPath();
      g.moveTo(ox, oy);
      g.arc(ox, oy, OR, angle0(i), angle0(i) + step);
      g.closePath();
      g.fillStyle = hexToRgba(it.color, 0.1);
      g.fill();
    });
    items.forEach(function (it, i) {
      if (!state.now[i]) return;
      g.beginPath();
      g.moveTo(ox, oy);
      g.arc(ox, oy, (OR * state.now[i]) / MAX, angle0(i), angle0(i) + step);
      g.closePath();
      g.fillStyle = hexToRgba(it.color, 0.88);
      g.fill();
    });
    for (var k = 1; k <= MAX; k++) {
      g.beginPath();
      g.arc(ox, oy, (OR * k) / MAX, 0, Math.PI * 2);
      g.strokeStyle = k === 5 ? "rgba(4,33,67,.26)" : "rgba(4,33,67,.12)";
      g.lineWidth = 2;
      g.stroke();
    }
    items.forEach(function (it, i) {
      var p = pt(ox, oy, OR, angle0(i));
      g.beginPath();
      g.moveTo(ox, oy);
      g.lineTo(p[0], p[1]);
      g.strokeStyle = "rgba(4,33,67,.12)";
      g.lineWidth = 2;
      g.stroke();
    });
    g.beginPath();
    g.arc(ox, oy, OR, 0, Math.PI * 2);
    g.strokeStyle = "rgba(4,33,67,.45)";
    g.lineWidth = 3;
    g.stroke();

    var hasIdeal = count("ideal") > 0;
    if (hasIdeal && typeof Path2D === "function") {
      g.save();
      g.setLineDash([14, 9]);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = INK.heading;
      g.lineWidth = 5;
      g.stroke(new Path2D(idealPathData(ox, oy, OR)));
      g.restore();
    }

    items.forEach(function (it, i) {
      var a = labelAngle(i);
      var p = pt(ox, oy, OR + 32, a);
      var lines = labelLines(i, 31);
      var lay = labelLayout(a, p[1], lines);
      g.textAlign = lay.align;
      lines.forEach(function (l, j) {
        if (l.kind === "score") {
          g.fillStyle = it.color;
          g.font = "800 " + l.size + "px " + FONT;
          g.fillText(scoreText(i), p[0], lay.ys[j]);
        } else if (l.kind === "note") {
          g.fillStyle = INK.muted;
          g.font = "400 " + l.size.toFixed(1) + "px " + FONT;
          g.fillText(l.t, p[0], lay.ys[j]);
        } else {
          g.fillStyle = INK.heading;
          g.font = "600 " + l.size + "px " + FONT;
          g.fillText(l.t, p[0], lay.ys[j]);
        }
      });
    });
    y = oy + 372 + 48;

    // 凡例（理想の点数があるときだけ）
    if (hasIdeal) {
      g.font = "400 26px " + FONT;
      var t1 = "塗りつぶし：いまの点数";
      var t2 = "点線：理想の点数";
      var w1 = 30 + 12 + g.measureText(t1).width;
      var w2 = 52 + 12 + g.measureText(t2).width;
      var lx = cw / 2 - (w1 + 48 + w2) / 2;
      items.forEach(function (it, i) {
        g.beginPath();
        g.moveTo(lx + 15, y);
        g.arc(lx + 15, y, 15, angle0(i), angle0(i) + step);
        g.closePath();
        g.fillStyle = it.color;
        g.fill();
      });
      g.textAlign = "left";
      g.fillStyle = INK.muted;
      g.fillText(t1, lx + 42, y);
      var lx2 = lx + w1 + 48;
      g.save();
      g.beginPath();
      g.setLineDash([10, 6]);
      g.moveTo(lx2, y);
      g.lineTo(lx2 + 52, y);
      g.strokeStyle = INK.heading;
      g.lineWidth = 4;
      g.stroke();
      g.restore();
      g.fillText(t2, lx2 + 64, y);
      y += 74;
    } else {
      y += 20;
    }

    // 平均
    g.textAlign = "center";
    g.fillStyle = INK.heading;
    g.font = "700 40px " + FONT;
    var avg = "いまの平均 " + average("now") + "点";
    if (isComplete("ideal")) avg += "　／　理想の平均 " + average("ideal") + "点";
    g.fillText(avg, cw / 2, y);
    y += 64;

    // ひとことまとめ
    var sum = summaryRows();
    if (sum.length) {
      drawDivider(g, cw, y);
      y += 58;
      drawSectionTitle(g, "ひとことまとめ", y);
      y += 46;
      sum.forEach(function (r) {
        y = drawBlock(g, M, y, TW, r.label, r.value + r.score, { bold: true });
      });
    }

    // 振り返り
    var focus = items[state.focus];
    var insight = state.insight.trim();
    var firstStep = state.firstStep.trim();
    if (insight || focus || firstStep) {
      y += 8;
      drawDivider(g, cw, y);
      y += 58;
      drawSectionTitle(g, "振り返り", y);
      y += 46;
      if (insight) y = drawBlock(g, M, y, TW, "気づいたこと・感じたこと", insight);
      if (focus) y = drawBlock(g, M, y, TW, "いちばん変えたい領域", focus.name, { bold: true, dot: focus.color });
      if (firstStep) y = drawBlock(g, M, y, TW, "最初の一歩", firstStep);
    }

    // フッター
    y += 40;
    if (ch) {
      g.fillStyle = INK.gold;
      g.font = "700 22px " + FONT;
      spacedText(g, "COACHING-L", cw / 2, ch - 86, 6);
    }
    return y + 110;
  }

  function drawCard() {
    var cw = 1080;
    var probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    var ch = Math.max(1350, Math.ceil(paintCard(probe.getContext("2d"), cw, 0)));
    var cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = ch;
    paintCard(cv.getContext("2d"), cw, ch);
    return cv;
  }

  /* iPhone の共有メニューは押した直後に開く必要があるので、画像は先に作っておく */
  function scheduleCard() {
    cardBlob = null;
    clearTimeout(cardTimer);
    if (!isComplete("now")) return;
    cardTimer = setTimeout(function () {
      drawCard().toBlob(function (b) {
        cardBlob = b;
      }, "image/png");
    }, 300);
  }

  function withBlob(cb) {
    if (cardBlob) {
      cb(cardBlob);
      return;
    }
    drawCard().toBlob(function (b) {
      cardBlob = b;
      cb(b);
    }, "image/png");
  }

  function saveByLink(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
    showMsg("画像をダウンロードしました。", true);
  }

  /* アプリの中のブラウザでは、画像を表示して長押しで保存してもらう */
  function showPreview() {
    els.previewImage.src = drawCard().toDataURL("image/png");
    if (typeof els.preview.showModal === "function") els.preview.showModal();
    else els.preview.setAttribute("open", "");
  }

  function closePreview() {
    if (typeof els.preview.close === "function") els.preview.close();
    else els.preview.removeAttribute("open");
  }

  /* いまの点数がそろっていないときは、足りない領域を知らせる */
  function requireNow() {
    if (isComplete("now")) return true;
    setMode("now");
    rows.forEach(function (r, i) {
      r.row.classList.toggle("is-missing", !state.now[i]);
    });
    showMsg("いまの点数に、まだ選んでいない領域があります（あと " + (n - count("now")) + " 領域）");
    rows[state.now.indexOf(0)].row.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    return false;
  }

  function download() {
    if (!requireNow()) return;
    if (isInAppBrowser) {
      showPreview();
      return;
    }
    if (isIOS && cardBlob && navigator.canShare) {
      var file = new File([cardBlob], fileName(), { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        var blob = cardBlob;
        showMsg("表示されたメニューから「画像を保存」を選んでください。", true);
        navigator.share({ files: [file] }).then(
          function () {
            showMsg("");
          },
          function (err) {
            if (err && err.name === "AbortError") {
              showMsg("");
              return;
            }
            saveByLink(blob);
          }
        );
        return;
      }
    }
    withBlob(saveByLink);
  }

  /* ---------- 最初からやり直す ---------- */

  function resetAll() {
    if (!window.confirm("入力した内容をすべて消して、最初からやり直しますか？")) return;
    state = emptyState();
    els.name.value = "";
    els.insight.value = "";
    els.firstStep.value = "";
    rows.forEach(function (r) {
      r.row.classList.remove("is-missing");
    });
    showMsg("");
    update();
    clearSaved();
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  /* ---------- はじめに ---------- */

  function bindText(el, key) {
    el.value = state[key];
    el.addEventListener("input", function () {
      state[key] = el.value;
      save();
      scheduleCard();
    });
  }

  function start() {
    buildItems();
    buildChart();
    buildFocus();

    bindText(els.name, "name");
    bindText(els.insight, "insight");
    bindText(els.firstStep, "firstStep");

    els.modeButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        setMode(b.getAttribute("data-mode"));
      });
    });
    els.nextStepButton.addEventListener("click", function () {
      if (nextAction === "result") {
        els.result.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        return;
      }
      setMode(nextAction);
      els.rate.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    });
    els.download.addEventListener("click", download);
    els.reset.addEventListener("click", resetAll);
    els.previewClose.addEventListener("click", closePreview);

    // file:// で開いたときは、ブラウザの制限で画像を保存できなくなるため、ロゴを画像に入れない
    if (location.protocol !== "file:") {
      var img = new Image();
      img.onload = function () {
        logo = img;
        scheduleCard();
      };
      img.src = "icons/logo-144.png";
    }

    update();
  }

  start();
})();

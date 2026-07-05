// Данные зашиты — только для Дениса
const PROFILE = {
  name: "Денис",
  enlistment: "2026-06-29",
  oath: "2026-07-25",
  discharge: "2027-06-29"
};

const BAR_COUNT = 56;
const MS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000
};

const BIG_UNITS = new Set(["months", "weeks", "days"]);

const UNITS = [
  { key: "months", one: "месяц", few: "месяца", many: "месяцев", groups: ["md", "mnd"] },
  { key: "weeks", one: "неделя", few: "недели", many: "недель", groups: ["mnd", "nd"] },
  { key: "days", one: "день", few: "дня", many: "дней", groups: ["d", "md", "mnd", "nd"] },
  { key: "hours", one: "час", few: "часа", many: "часов", groups: ["d", "md", "mnd", "nd"] },
  { key: "minutes", one: "минута", few: "минуты", many: "минут", groups: ["d", "md", "mnd", "nd"] },
  { key: "seconds", one: "секунда", few: "секунды", many: "секунд", groups: ["d", "md", "mnd", "nd"] }
];

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

const HOLIDAYS = [
  { month: 2, day: 23, title: "День защитника Отечества" },
  { month: 5, day: 9, title: "День Победы" },
  { month: 7, day: 28, title: "День ВМФ" },
  { month: 8, day: 2, title: "День ВДВ" },
  { month: 11, day: 19, title: "День ракетных войск и артиллерии" },
  { month: 12, day: 1, title: "Наступление зимы" }
];

const els = {
  displayName: document.getElementById("displayName"),
  progressBars: document.getElementById("progressBars"),
  mainValue: document.getElementById("mainValue"),
  elapsedCol: document.getElementById("elapsedCol"),
  remainingCol: document.getElementById("remainingCol"),
  enlistmentShort: document.getElementById("enlistmentShort"),
  oathShort: document.getElementById("oathShort"),
  dischargeShort: document.getElementById("dischargeShort"),
  holidayText: document.getElementById("holidayText")
};

let displayMode = "percent";
let unitGroup = "d";
let lastElapsed = null;
let lastRemaining = null;
let lastRatio = 0;
let lastElapsedSec = 0;
let lastFrom = null;
let lastTo = null;
let lastDischarge = null;

function parseLocalDate(iso) {
  return new Date(iso + "T00:00:00");
}

function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function emptyParts() {
  return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
}

function msToHms(ms) {
  let r = Math.max(0, Math.floor(ms));
  const hours = Math.floor(r / MS.hour);
  r -= hours * MS.hour;
  const minutes = Math.floor(r / MS.minute);
  r -= minutes * MS.minute;
  const seconds = Math.floor(r / MS.second);
  return { hours, minutes, seconds };
}

function countCalendarMonths(from, to) {
  let months = 0;
  let cursor = new Date(from);

  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next.getTime() <= to.getTime()) {
      months++;
      cursor = next;
    } else {
      break;
    }
  }

  return { months, cursor };
}

function decomposeRange(from, to, group) {
  if (!from || !to || to <= from) return emptyParts();

  const totalMs = to.getTime() - from.getTime();

  if (group === "d") {
    const days = Math.floor(totalMs / MS.day);
    const { hours, minutes, seconds } = msToHms(totalMs - days * MS.day);
    return { months: 0, weeks: 0, days, hours, minutes, seconds };
  }

  if (group === "nd") {
    const weeks = Math.floor(totalMs / MS.week);
    let rest = totalMs - weeks * MS.week;
    const days = Math.floor(rest / MS.day);
    rest -= days * MS.day;
    const { hours, minutes, seconds } = msToHms(rest);
    return { months: 0, weeks, days, hours, minutes, seconds };
  }

  const { months, cursor } = countCalendarMonths(from, to);
  let rest = to.getTime() - cursor.getTime();

  if (group === "md") {
    const days = Math.floor(rest / MS.day);
    rest -= days * MS.day;
    const { hours, minutes, seconds } = msToHms(rest);
    return { months, weeks: 0, days, hours, minutes, seconds };
  }

  const weeks = Math.floor(rest / MS.week);
  rest -= weeks * MS.week;
  const days = Math.floor(rest / MS.day);
  rest -= days * MS.day;
  const { hours, minutes, seconds } = msToHms(rest);
  return { months, weeks, days, hours, minutes, seconds };
}

function formatShortDate(iso) {
  const d = parseLocalDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNumber(n) {
  return n.toLocaleString("ru-RU");
}

function formatPercent(n) {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}

function getTodayHoliday() {
  const now = new Date();
  const hit = HOLIDAYS.find(
    (h) => h.month === now.getMonth() + 1 && h.day === now.getDate()
  );
  if (hit) return hit.title;

  const upcoming = HOLIDAYS.map((h) => {
    const year = now.getFullYear();
    let date = new Date(year, h.month - 1, h.day);
    if (date < now) date = new Date(year + 1, h.month - 1, h.day);
    return { ...h, date };
  }).sort((a, b) => a.date - b.date);

  const daysLeft = Math.ceil((upcoming[0].date - now) / MS.day);
  return `через ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}: ${upcoming[0].title.toLowerCase()}`;
}

function buildProgressBars() {
  els.progressBars.innerHTML = "";
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.height = `${14 + (i % 4) * 5}px`;
    els.progressBars.appendChild(bar);
  }
}

function updateProgressBars(ratio) {
  const filled = Math.round(ratio * BAR_COUNT);
  els.progressBars.querySelectorAll(".progress-bar").forEach((bar, i) => {
    bar.classList.toggle("filled", i < filled);
  });
}

function renderStatColumn(container, data) {
  container.innerHTML = UNITS.map((u) => {
    const n = data[u.key];
    const hidden = !u.groups.includes(unitGroup) ? " hidden" : "";
    const big = BIG_UNITS.has(u.key) ? " stat-row--big" : "";
    return `<div class="stat-row${hidden}${big}" data-unit="${u.key}">
      <span class="stat-num">${n}</span>
      <span class="stat-unit">${plural(n, u.one, u.few, u.many)}</span>
    </div>`;
  }).join("");
}

function renderStatsTable(elapsed, remaining) {
  renderStatColumn(els.elapsedCol, elapsed);
  renderStatColumn(els.remainingCol, remaining);
}

function updateMainValue() {
  switch (displayMode) {
    case "seconds":
      els.mainValue.textContent = formatNumber(lastElapsedSec);
      break;
    case "months":
      els.mainValue.textContent = String(lastRemaining ? lastRemaining.months : 0);
      break;
    case "hours":
      els.mainValue.textContent = formatNumber(
        Math.floor((lastElapsedSec || 0) / 3600)
      );
      break;
    default:
      els.mainValue.textContent = formatPercent(lastRatio * 100);
  }
}

function updateStatsDisplay() {
  if (!lastFrom || !lastTo || !lastDischarge) return;

  lastElapsed = decomposeRange(lastFrom, lastTo, unitGroup);
  lastRemaining = decomposeRange(lastTo, lastDischarge, unitGroup);
  renderStatsTable(lastElapsed, lastRemaining);
  updateMainValue();
}

function tick() {
  const enlistment = parseLocalDate(PROFILE.enlistment);
  const discharge = parseLocalDate(PROFILE.discharge);
  const now = new Date();

  const totalMs = discharge - enlistment;
  const elapsedMs = Math.min(Math.max(now - enlistment, 0), totalMs);
  const ratio = totalMs > 0 ? elapsedMs / totalMs : 0;

  lastFrom = enlistment;
  lastTo = now;
  lastDischarge = discharge;
  lastRatio = ratio;
  lastElapsedSec = Math.floor(elapsedMs / 1000);

  els.displayName.textContent = PROFILE.name.toLowerCase();

  updateStatsDisplay();
  updateProgressBars(ratio);

  els.enlistmentShort.textContent = formatShortDate(PROFILE.enlistment);
  els.oathShort.textContent = formatShortDate(PROFILE.oath);
  els.dischargeShort.textContent = formatShortDate(PROFILE.discharge);
  els.holidayText.textContent = getTodayHoliday();
}

function initTabs() {
  document.querySelectorAll(".display-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".display-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      displayMode = btn.dataset.mode;
      updateMainValue();
    });
  });

  document.querySelectorAll(".unit-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".unit-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      unitGroup = btn.dataset.units;
      updateStatsDisplay();
    });
  });
}

function init() {
  buildProgressBars();
  initTabs();

  tick();
  setInterval(tick, 1000);
}

init();

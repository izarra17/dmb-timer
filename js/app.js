// Данные зашиты — только для Дениса
const PROFILE = {
  name: "Денис",
  enlistment: "2026-06-29",
  oath: "2026-07-25",
  discharge: "2027-06-29",
  relationship: "06-12"
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

const SERVICE_HOLIDAYS = [
  { month: 2, day: 23, title: "День защитника Отечества" },
  { month: 5, day: 9, title: "День Победы" },
  { month: 7, day: 28, title: "День ВМФ" },
  { month: 8, day: 2, title: "День ВДВ" },
  { month: 11, day: 19, title: "День ракетных войск и артиллерии" }
];

const els = {
  displayName: document.getElementById("displayName"),
  progressBars: document.getElementById("progressBars"),
  mainValue: document.getElementById("mainValue"),
  mainUnitLine: document.getElementById("mainUnitLine"),
  mainTotalLine: document.getElementById("mainTotalLine"),
  mainDisplay: document.getElementById("mainDisplay"),
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
let lastTotalSec = 0;

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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS.day);
}

function isOnTimeline(date, timelineStart, discharge) {
  const day = startOfDay(date);
  return day >= startOfDay(timelineStart) && day <= startOfDay(discharge);
}

function buildServiceEvents() {
  const enlistment = parseLocalDate(PROFILE.enlistment);
  const discharge = parseLocalDate(PROFILE.discharge);
  const oath = parseLocalDate(PROFILE.oath);
  const totalDays = daysBetween(enlistment, discharge);
  const quarter = Math.floor(totalDays / 4);
  const half = Math.floor(totalDays / 2);
  const enlistYear = enlistment.getFullYear();
  const dischargeYear = discharge.getFullYear();
  const [relMonth, relDay] = PROFILE.relationship.split("-").map(Number);
  const timelineStart = new Date(enlistYear, relMonth - 1, relDay);

  const events = [
    { title: "Год отношений", date: new Date(enlistYear, relMonth - 1, relDay), priority: 0 },
    { title: "Призыв", date: enlistment, priority: 0 },
    { title: "Присяга", date: oath, priority: 0 },
    { title: "Наступление осени", date: new Date(enlistYear, 8, 1), priority: 0 },
    { title: "300 дней до дембеля", date: addDays(discharge, -300), priority: 0 },
    { title: "Прошла четверть службы", date: addDays(enlistment, quarter), priority: 0 },
    { title: "100 дней после призыва", date: addDays(enlistment, 100), priority: 0 },
    { title: "Наступление зимы", date: new Date(enlistYear, 11, 1), priority: 0 },
    { title: "200 дней до дембеля", date: addDays(discharge, -200), priority: 0 },
    { title: "Половина службы", date: addDays(enlistment, half), priority: 0 },
    { title: `Новый год ${dischargeYear}`, date: new Date(dischargeYear, 0, 1), priority: 0 },
    { title: "200 дней после призыва", date: addDays(enlistment, 200), priority: 0 },
    { title: "Наступление весны", date: new Date(dischargeYear, 2, 1), priority: 0 },
    { title: "100 дней до дембеля", date: addDays(discharge, -100), priority: 0 },
    { title: "Осталась четверть службы", date: addDays(discharge, -quarter), priority: 0 },
    { title: "300 дней после призыва", date: addDays(enlistment, 300), priority: 0 },
    { title: "Наступление лета", date: new Date(dischargeYear, 5, 1), priority: 0 },
    { title: "Дембель", date: discharge, priority: 0 }
  ];

  if (dischargeYear > enlistYear) {
    events.push({
      title: "Год отношений",
      date: new Date(dischargeYear, relMonth - 1, relDay),
      priority: 0
    });
  }

  for (let year = enlistYear; year <= dischargeYear; year++) {
    for (const h of SERVICE_HOLIDAYS) {
      events.push({
        title: h.title,
        date: new Date(year, h.month - 1, h.day),
        priority: 1
      });
    }
  }

  const unique = new Map();
  for (const event of events) {
    if (!isOnTimeline(event.date, timelineStart, discharge)) continue;
    const key = `${startOfDay(event.date).getTime()}-${event.title}`;
    unique.set(key, event);
  }

  return [...unique.values()].sort((a, b) => {
    const diff = a.date - b.date;
    if (diff !== 0) return diff;
    return (a.priority || 0) - (b.priority || 0);
  });
}

function formatDaysLeft(n) {
  if (n === 1) return "остался 1 день";
  return `осталось ${n} ${plural(n, "день", "дня", "дней")}`;
}

function formatDaysPassed(n) {
  if (n === 1) return "прошёл 1 день";
  return `прошло ${n} ${plural(n, "день", "дня", "дней")}`;
}

function getBannerEvent(now) {
  const events = buildServiceEvents();
  if (!events.length) return "загрузка…";

  const today = startOfDay(now);
  const todayEvent = events.find((e) => startOfDay(e.date).getTime() === today.getTime());
  if (todayEvent) {
    return todayEvent.title.toLowerCase();
  }

  const upcoming = events.find((e) => startOfDay(e.date) > today);
  if (upcoming) {
    const daysLeft = daysBetween(now, upcoming.date);
    return `${formatDaysLeft(daysLeft)}: ${upcoming.title.toLowerCase()}`;
  }

  const last = events[events.length - 1];
  const daysPassed = daysBetween(last.date, now);
  return `${formatDaysPassed(daysPassed)}: ${last.title.toLowerCase()}`;
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
  const { mainValue, mainUnitLine, mainTotalLine, mainDisplay } = els;

  if (displayMode === "seconds" || displayMode === "minutes" || displayMode === "hours") {
    const units = {
      seconds: { div: 1, one: "секунда", few: "секунды", many: "секунд" },
      minutes: { div: 60, one: "минута", few: "минуты", many: "минут" },
      hours: { div: 3600, one: "час", few: "часа", many: "часов" }
    };
    const u = units[displayMode];
    const elapsed = Math.floor(lastElapsedSec / u.div);
    const total = Math.floor(lastTotalSec / u.div);

    mainDisplay.classList.add("main-display--unit");
    mainValue.textContent = formatNumber(elapsed);
    mainUnitLine.textContent = `${plural(elapsed, u.one, u.few, u.many)} из`;
    mainTotalLine.textContent = formatNumber(total);
    mainUnitLine.classList.remove("hidden");
    mainTotalLine.classList.remove("hidden");
    return;
  }

  mainDisplay.classList.remove("main-display--unit");
  mainUnitLine.classList.add("hidden");
  mainTotalLine.classList.add("hidden");
  mainValue.textContent = formatPercent(lastRatio * 100);
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
  lastTotalSec = Math.floor(totalMs / 1000);

  els.displayName.textContent = PROFILE.name.toLowerCase();

  updateStatsDisplay();
  updateProgressBars(ratio);

  els.enlistmentShort.textContent = formatShortDate(PROFILE.enlistment);
  els.oathShort.textContent = formatShortDate(PROFILE.oath);
  els.dischargeShort.textContent = formatShortDate(PROFILE.discharge);
  els.holidayText.textContent = getBannerEvent(now);
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

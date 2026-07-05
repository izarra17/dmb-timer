// Данные зашиты — только для Дениса
const PROFILE = {
  name: "Денис",
  enlistment: "2026-06-29",
  oath: "2026-07-25",
  serviceMonths: 12
};

const BAR_COUNT = 48;

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

const HOLIDAYS = [
  { month: 1, day: 25, title: "День российского студенчества" },
  { month: 2, day: 23, title: "День защитника Отечества" },
  { month: 3, day: 1, title: "Наступление весны" },
  { month: 3, day: 23, title: "День космонавтики" },
  { month: 4, day: 15, title: "День специалиста РАВ" },
  { month: 5, day: 9, title: "День Победы" },
  { month: 5, day: 28, title: "День пограничника" },
  { month: 6, day: 1, title: "Наступление лета" },
  { month: 6, day: 12, title: "День России" },
  { month: 7, day: 28, title: "День ВМФ" },
  { month: 8, day: 2, title: "День ВДВ" },
  { month: 8, day: 12, title: "День ВВС" },
  { month: 9, day: 1, title: "Наступление осени" },
  { month: 9, day: 3, title: "День солидарности в борьбе с терроризмом" },
  { month: 10, day: 20, title: "День военного связиста" },
  { month: 10, day: 28, title: "День армейской авиации" },
  { month: 11, day: 5, title: "День военного разведчика" },
  { month: 11, day: 19, title: "День ракетных войск и артиллерии" },
  { month: 11, day: 27, title: "День морской пехоты" },
  { month: 12, day: 1, title: "Наступление зимы" }
];

const els = {
  displayName: document.getElementById("displayName"),
  progressBars: document.getElementById("progressBars"),
  percent: document.getElementById("percent"),
  secondsLine: document.getElementById("secondsLine"),
  elapsedDays: document.getElementById("elapsedDays"),
  elapsedDetail: document.getElementById("elapsedDetail"),
  remainingDays: document.getElementById("remainingDays"),
  remainingDetail: document.getElementById("remainingDetail"),
  enlistmentShort: document.getElementById("enlistmentShort"),
  oathShort: document.getElementById("oathShort"),
  dischargeShort: document.getElementById("dischargeShort"),
  holidayText: document.getElementById("holidayText"),
  btnTogglePrivacy: document.getElementById("btnTogglePrivacy")
};

let privacyMode = false;

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const h = `${hours} ${plural(hours, "час", "часа", "часов")}`;
  const m = `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`;
  const s = `${seconds} ${plural(seconds, "секунда", "секунды", "секунд")}`;

  return `${h}, ${m}, ${s}`;
}

function formatDays(n) {
  return `${n} ${plural(n, "день", "дня", "дней")}`;
}

function formatShortDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNumber(n) {
  return n.toLocaleString("ru-RU");
}

function formatPercent(n) {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6
  }) + "%";
}

function getTodayHoliday() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const hit = HOLIDAYS.find((h) => h.month === m && h.day === d);
  if (hit) return hit.title;

  const upcoming = HOLIDAYS.map((h) => {
    const year = now.getFullYear();
    let date = new Date(year, h.month - 1, h.day);
    if (date < now) date = new Date(year + 1, h.month - 1, h.day);
    return { ...h, date };
  }).sort((a, b) => a.date - b.date);

  const next = upcoming[0];
  const daysLeft = Math.ceil((next.date - now) / 86400000);
  return `через ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}: ${next.title.toLowerCase()}`;
}

function buildProgressBars() {
  els.progressBars.innerHTML = "";
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.height = `${20 + (i % 5) * 4}px`;
    els.progressBars.appendChild(bar);
  }
}

function updateProgressBars(ratio) {
  const bars = els.progressBars.querySelectorAll(".progress-bar");
  const filled = Math.round(ratio * BAR_COUNT);
  bars.forEach((bar, i) => {
    bar.classList.toggle("filled", i < filled);
  });
}

function tick() {
  const enlistment = new Date(PROFILE.enlistment + "T00:00:00");
  const discharge = addMonths(enlistment, PROFILE.serviceMonths);
  const now = new Date();

  const totalMs = discharge - enlistment;
  const elapsedMs = Math.min(Math.max(now - enlistment, 0), totalMs);
  const remainingMs = Math.max(discharge - now, 0);

  const ratio = totalMs > 0 ? elapsedMs / totalMs : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const totalSec = Math.floor(totalMs / 1000);

  els.displayName.textContent = PROFILE.name.toLowerCase();
  els.percent.textContent = formatPercent(ratio * 100);
  els.secondsLine.textContent =
    `${formatNumber(elapsedSec)} секунд из ${formatNumber(totalSec)}`;

  els.elapsedDays.textContent = formatDays(Math.floor(elapsedMs / 86400000));
  els.elapsedDetail.textContent = formatDuration(elapsedMs);
  els.remainingDays.textContent = formatDays(Math.ceil(remainingMs / 86400000));
  els.remainingDetail.textContent = formatDuration(remainingMs);

  els.enlistmentShort.textContent = formatShortDate(PROFILE.enlistment);
  els.oathShort.textContent = formatShortDate(PROFILE.oath);
  els.dischargeShort.textContent = formatShortDate(
    discharge.toISOString().slice(0, 10)
  );

  els.holidayText.textContent = getTodayHoliday();
  updateProgressBars(ratio);
}

function init() {
  buildProgressBars();

  els.btnTogglePrivacy.addEventListener("click", () => {
    privacyMode = !privacyMode;
    document.body.classList.toggle("privacy", privacyMode);
  });

  tick();
  setInterval(tick, 1000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();

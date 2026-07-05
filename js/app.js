const STORAGE_KEY = "dmb-timer-settings";
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
  dischargeShort: document.getElementById("dischargeShort"),
  holidayText: document.getElementById("holidayText"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  inputName: document.getElementById("inputName"),
  inputEnlistment: document.getElementById("inputEnlistment"),
  btnSettings: document.getElementById("btnSettings"),
  btnCloseSettings: document.getElementById("btnCloseSettings"),
  btnTogglePrivacy: document.getElementById("btnTogglePrivacy")
};

let settings = loadSettings();
let privacyMode = false;

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    name: "Солдат",
    enlistment: defaultEnlistment(),
    serviceMonths: 12
  };
}

function defaultEnlistment() {
  const d = new Date();
  d.setMonth(d.getMonth() - 4);
  return d.toISOString().slice(0, 10);
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

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
  const days = Math.floor(totalSec / 86400);
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
    let year = now.getFullYear();
    let date = new Date(year, h.month - 1, h.day);
    if (date < now) date = new Date(year + 1, h.month - 1, h.day);
    return { ...h, date };
  }).sort((a, b) => a.date - b.date);

  const next = upcoming[0];
  const daysLeft = Math.ceil((next.date - now) / 86400000);
  return `Через ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}: ${next.title}`;
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
  const enlistment = new Date(settings.enlistment + "T00:00:00");
  const discharge = addMonths(enlistment, settings.serviceMonths);
  const now = new Date();

  const totalMs = discharge - enlistment;
  const elapsedMs = Math.min(Math.max(now - enlistment, 0), totalMs);
  const remainingMs = Math.max(discharge - now, 0);

  const ratio = totalMs > 0 ? elapsedMs / totalMs : 0;
  const percent = ratio * 100;

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const totalSec = Math.floor(totalMs / 1000);

  els.displayName.textContent = settings.name || "Солдат";
  els.percent.textContent = formatPercent(percent);
  els.secondsLine.textContent =
    `${formatNumber(elapsedSec)} секунд из ${formatNumber(totalSec)}`;

  const elapsedDays = Math.floor(elapsedMs / 86400000);
  const remainingDays = Math.ceil(remainingMs / 86400000);

  els.elapsedDays.textContent = formatDays(elapsedDays);
  els.elapsedDetail.textContent = formatDuration(elapsedMs);
  els.remainingDays.textContent = formatDays(remainingDays);
  els.remainingDetail.textContent = formatDuration(remainingMs);

  els.enlistmentShort.textContent = formatShortDate(settings.enlistment);
  els.dischargeShort.textContent = formatShortDate(
    discharge.toISOString().slice(0, 10)
  );

  els.holidayText.textContent = getTodayHoliday();
  updateProgressBars(ratio);
}

function openSettings() {
  els.inputName.value = settings.name;
  els.inputEnlistment.value = settings.enlistment;
  document
    .querySelectorAll('input[name="serviceMonths"]')
    .forEach((r) => {
      r.checked = Number(r.value) === settings.serviceMonths;
    });
  els.settingsDialog.showModal();
}

function initProgressBars() {
  buildProgressBars();
}

function initEvents() {
  els.btnSettings.addEventListener("click", openSettings);
  els.btnCloseSettings.addEventListener("click", () => els.settingsDialog.close());

  els.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    settings.name = els.inputName.value.trim() || "Солдат";
    settings.enlistment = els.inputEnlistment.value;
    settings.serviceMonths = Number(
      document.querySelector('input[name="serviceMonths"]:checked').value
    );
    saveSettings();
    els.settingsDialog.close();
    tick();
  });

  els.btnTogglePrivacy.addEventListener("click", () => {
    privacyMode = !privacyMode;
    document.body.classList.toggle("privacy", privacyMode);
  });

  els.settingsDialog.addEventListener("click", (e) => {
    if (e.target === els.settingsDialog) els.settingsDialog.close();
  });
}

function init() {
  initProgressBars();
  initEvents();
  tick();
  setInterval(tick, 1000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();

const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");

const resultsBox = document.getElementById("resultsBox");
const resultsList = document.getElementById("resultsList");
const resultCount = document.getElementById("resultCount");

const emptyState = document.getElementById("emptyState");
const profile = document.getElementById("profile");

const detailsEmpty = document.getElementById("detailsEmpty");
const details = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");

const photo = document.getElementById("photo");
const empName = document.getElementById("empName");
const empRole = document.getElementById("empRole");
const empId = document.getElementById("empId");
const empGender = document.getElementById("empGender");
const empDob = document.getElementById("empDob");
const empJoin = document.getElementById("empJoin");
const badges = document.getElementById("badges");

document.getElementById("year").textContent = new Date().getFullYear();

const FIELDS_ORDER = [
  "ល.រ",
  "ការិយាល័យ",
  "ឋានន្តរសក្តិ",
  "គោន្តនាម-នាម",
  "ភេទ",
  "ថ្ងៃកំណើត",
  "ថ្ងៃចូលទ័ព",
  "អត្តលេខ",
  "មុខដំណែង",
  "ជំនាញ សិក្សាក្នុងស្រុក",
  "ជំនាញ សិក្សាក្រៅប្រទេស",
  "សកម្ម",
  "មិនសូវសកម្ម",
  "អសកម្ម",
  "ចុះបេសកម្ម",
  "រូបភាព"
];

function debounce(fn, delay=300){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function safe(v){
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function resolvePhotoPath(value){
  const v = (value || "").trim();
  if (!v) return "images/default.png";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  // else filename
  return `images/${v}`;
}

function buildStatusBadges(emp){
  badges.innerHTML = "";

  const statusDefs = [
    { key: "សកម្ម", label: "សកម្ម", cls: "text-bg-success" },
    { key: "មិនសូវសកម្ម", label: "មិនសូវសកម្ម", cls: "text-bg-warning" },
    { key: "អសកម្ម", label: "អសកម្ម", cls: "text-bg-secondary" }
  ];

  let any = false;

  for (const s of statusDefs){
    const val = (emp[s.key] || "").toString().trim();
    // If value is not empty/0, show badge
    const show = val !== "" && val !== "0" && val.toLowerCase() !== "no" && val !== "False";
    if (show){
      any = true;
      const span = document.createElement("span");
      span.className = `badge rounded-pill ${s.cls}`;
      span.textContent = s.label;
      badges.appendChild(span);
    }
  }

  if (!any){
    const span = document.createElement("span");
    span.className = "badge rounded-pill badge-soft";
    span.textContent = "ស្ថានភាព: —";
    badges.appendChild(span);
  }
}

function renderEmployee(emp){
  // left profile
  photo.src = resolvePhotoPath(emp["រូបភាព"]);
  empName.textContent = safe(emp["គោន្តនាម-នាម"]);
  empRole.textContent = `${safe(emp["មុខដំណែង"])} • ${safe(emp["ការិយាល័យ"])}`;

  empId.textContent = safe(emp["អត្តលេខ"]);
  empGender.textContent = safe(emp["ភេទ"]);
  empDob.textContent = safe(emp["ថ្ងៃកំណើត"]);
  empJoin.textContent = safe(emp["ថ្ងៃចូលទ័ព"]);

  buildStatusBadges(emp);

  emptyState.classList.add("d-none");
  profile.classList.remove("d-none");

  // details table
  detailsBody.innerHTML = "";

  for (const key of FIELDS_ORDER){
    // hide image as row, because photo is shown; but still show link/name if wanted
    if (key === "រូបភាព") continue;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="key">${key}</td>
      <td class="value">${safe(emp[key])}</td>
    `;
    detailsBody.appendChild(tr);
  }

  // Show mission field with highlight if exists
  const mission = (emp["ចុះបេសកម្ម"] || "").toString().trim();
  if (mission){
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="key">ចុះបេសកម្ម</td>
      <td class="value"><span class="badge rounded-pill text-bg-info">${safe(mission)}</span></td>
    `;
    // Replace existing (avoid duplication), simply append at end if not already
    // (We already appended above; this is optional extra highlight)
  }

  detailsEmpty.classList.add("d-none");
  details.classList.remove("d-none");
}

function clearUI(){
  searchInput.value = "";
  resultsList.innerHTML = "";
  resultsBox.classList.add("d-none");
  resultCount.textContent = "0";

  profile.classList.add("d-none");
  emptyState.classList.remove("d-none");

  details.classList.add("d-none");
  detailsEmpty.classList.remove("d-none");
}

async function doSearch(q){
  q = (q || "").trim();
  if (!q){
    resultsList.innerHTML = "";
    resultsBox.classList.add("d-none");
    resultCount.textContent = "0";
    return;
  }

  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  resultsList.innerHTML = "";
  resultCount.textContent = `${data.count} result(s)`;
  resultsBox.classList.remove("d-none");

  if (!data.results.length){
    const div = document.createElement("div");
    div.className = "list-group-item";
    div.innerHTML = `<div class="fw-bold">មិនមានលទ្ធផល</div><div class="small opacity-75">សូមពិនិត្យពាក្យស្វែងរក</div>`;
    resultsList.appendChild(div);
    return;
  }

  data.results.forEach(emp => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action";

    const name = safe(emp["គោន្តនាម-នាម"]);
    const office = safe(emp["ការិយាល័យ"]);
    const role = safe(emp["មុខដំណែង"]);
    const id = safe(emp["អត្តលេខ"]);

    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div>
          <div class="fw-bold">${name}</div>
          <div class="small opacity-75">${role} • ${office}</div>
        </div>
        <div class="small opacity-75 text-nowrap">
          <i class="bi bi-upc-scan me-1"></i>${id}
        </div>
      </div>
    `;

    item.addEventListener("click", () => renderEmployee(emp));
    resultsList.appendChild(item);
  });
}

const debouncedSearch = debounce(doSearch, 250);

searchInput.addEventListener("input", (e) => debouncedSearch(e.target.value));
clearBtn.addEventListener("click", clearUI);

// Print
document.getElementById("printBtn").addEventListener("click", () => window.print());

// default clear
clearUI();
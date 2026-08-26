/* PRAMĀṆA front-end — SIH26036 */
const $ = (sel, el = document) => el.querySelector(sel);
const app = $("#app");

const S = {
  user: null,
  view: "landing",
  payload: {},
  cache: {},
};

const TYPE_LABEL = {
  electronic_weighing: "Electronic weighing instrument",
  platform_scale: "Platform scale",
  weighbridge: "Weighbridge",
  fuel_dispenser: "Fuel dispenser",
  beam_scale: "Beam scale",
  counter_machine: "Counter machine",
  load_cell: "Load cell",
  tape: "Tape measure",
  storage_tank: "Storage tank",
  taxi_meter: "Taxi / auto meter",
  water_meter: "Water meter",
};

function chip(status) {
  const map = {
    verified: ["ok", "Verified"],
    pending: ["warn", "Pending"],
    rejected: ["bad", "Rejected"],
    expired: ["warn", "Expired"],
    sealed_tampered: ["bad", "Seal tampered"],
    genuine: ["ok", "Genuine OEM"],
    third_party: ["bad", "Third-party"],
    unknown: ["muted", "Unknown"],
    submitted: ["info", "Submitted"],
    inspection_scheduled: ["warn", "Inspection scheduled"],
    certificate_issued: ["ok", "Certificate issued"],
    pass: ["ok", "Pass"],
    fail: ["bad", "Fail"],
    valid: ["ok", "Valid"],
    due: ["warn", "Due"],
    COMPLIANT: ["ok", "Compliant"],
    NON_COMPLIANT: ["bad", "Non-compliant"],
    EXPIRED: ["warn", "Expired"],
    GENUINE: ["ok", "Genuine"],
    THIRD_PARTY: ["bad", "Third-party"],
    INCONCLUSIVE: ["warn", "Inconclusive"],
  };
  const [k, lab] = map[status] || ["muted", status || "—"];
  return `<span class="chip ${k}">${lab}</span>`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: opts.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function go(view, payload = {}) {
  S.view = view;
  S.payload = payload;
  location.hash = view;
  render();
}

window.addEventListener("hashchange", () => {
  const v = location.hash.replace("#", "") || "landing";
  if (v !== S.view) {
    S.view = v;
    render();
  }
});

function brand(light = false) {
  return `
    <a class="brand" href="#landing" onclick="event.preventDefault(); logoutHome()">
      <img src="/static/img/logo.png" alt="PRAMANA emblem" />
      <div>
        <div class="nm">PRAMĀṆA</div>
        <div class="sub">प्रमाण · Trusted measure</div>
      </div>
    </a>`;
}

function logoutHome() {
  S.user = null;
  go("landing");
}

function topPublic() {
  return `
    <div class="topbar">
      ${brand()}
      <div class="toplinks">
        <button class="linkish" onclick="go('photo-check')">Upload &amp; check photo</button>
        <button class="linkish" onclick="go('guidelines')">Guidelines</button>
        <button class="linkish" onclick="go('public')">Public verify</button>
        <button class="linkish" onclick="go('login-user')">User login</button>
        <button class="linkish" onclick="go('login-officer')">Officer login</button>
      </div>
    </div>`;
}

function landing() {
  return `
    <div class="hero">
      ${topPublic()}
      <p class="kicker">Department of Consumer Affairs · Legal Metrology</p>
      <h1 class="display">Is this scale legal for trade — or a third-party clone?</h1>
      <p class="lede">
        PRAMĀṆA is the online verification lifecycle for weighing and measuring instruments:
        application, field inspection, stamping, public QR check, and a photograph-based
        authenticity lab that tells a trader or officer whether the instrument — and its parts —
        follow Indian Legal Metrology rules and OIML recommendations.
      </p>
      <div class="pschip">SIH26036 · Software · Transportation &amp; Logistics</div>

      <div class="mt mb">${photoCheckMarkup({ publicMode: true, compact: true })}</div>

      <div class="split">
        <article class="login-card user">
          <img class="watermark" src="/static/img/logo.png" alt="" />
          <div>
            <div class="role-tag">Window 01 · User / trader</div>
            <h2>Instrument owners</h2>
            <p>Register a scale, dispenser or weighbridge. Apply for verification. Photograph a nameplate or load cell and see if it is genuine OEM or a third-party part — and whether it is still inside Maximum Permissible Error.</p>
          </div>
          <button class="btn btn-saffron" onclick="go('login-user')">Open user login →</button>
        </article>
        <article class="login-card officer">
          <img class="watermark" src="/static/img/logo.png" alt="" />
          <div>
            <div class="role-tag">Window 02 · Quality / Legal Metrology Officer</div>
            <h2>Inspecting officers</h2>
            <p>Scrutiny queue, geo-tagged inspections, MPE test sheets against OIML R 76, stamping, certificate issue, and a chained audit log. Officers see every instrument in the district, not only their own.</p>
          </div>
          <button class="btn btn-gold" onclick="go('login-officer')">Open officer login →</button>
        </article>
      </div>

      <div class="public-strip">
        <div>
          <h3>Citizen check</h3>
          <p>No login. Scan a certificate, serial or QR token.</p>
        </div>
        <input id="pubq" placeholder="e.g. ESS-30K-88291 or MH/2026/B/4412/08821" />
        <button class="btn btn-saffron" onclick="go('public', {q: document.getElementById('pubq').value})">Verify</button>
      </div>

      <div class="stats-row">
        <div class="stat"><b>s.24</b><span>Legal Metrology Act, 2009</span></div>
        <div class="stat"><b>R 76</b><span>OIML NAWI accuracy classes</span></div>
        <div class="stat"><b>A–D</b><span>Quarter stamp + LMO identity</span></div>
        <div class="stat"><b>12 / 24 / 60</b><span>Re-verification months (Rule 27)</span></div>
      </div>
    </div>
    <div class="foot">
      <span>Ministry of Consumer Affairs, Food &amp; Public Distribution · Department of Consumer Affairs</span>
      <span>Smart India Hackathon 2026 · SIH26036 · Team PRAMĀṆA</span>
    </div>`;
}

function loginView(role) {
  const officer = role === "officer";
  return `
    <div class="auth-shell">
      <aside class="auth-art ${officer ? "officer" : "user"}">
        ${brand()}
        <div>
          <p class="kicker" style="color:#f3d7b0">SIH26036</p>
          <h1>${officer ? "Officer desk" : "User desk"}</h1>
          <p>${officer
            ? "Legal Metrology Officers and quality inspectors. Field evidence, MPE, stamping."
            : "Traders, manufacturers, repairers and instrument users. Apply, photograph, track certificates."}</p>
        </div>
        <p class="tiny">Separate login windows — an officer credential will be refused here if this is the user desk, and vice versa.</p>
      </aside>
      <section class="auth-panel">
        <button class="linkish" style="width:max-content;margin-bottom:18px" onclick="go('landing')">← Portal home</button>
        <h2>${officer ? "Quality officer login" : "User login"}</h2>
        <p class="hint">${officer ? "LMO / GATC inspector credentials" : "Registered user of weights &amp; measures"}</p>
        <div id="auth-err"></div>
        <div class="field"><label>Email</label><input id="em" type="email" autocomplete="username" value="${officer ? "officer@pramana.in" : "trader@pramana.in"}" /></div>
        <div class="field"><label>Password</label><input id="pw" type="password" autocomplete="current-password" value="${officer ? "officer123" : "trader123"}" /></div>
        <button class="btn ${officer ? "btn-navy" : "btn-saffron"} btn-full" onclick="doLogin('${role}')">Sign in to ${officer ? "officer" : "user"} window</button>
        <div class="demo">
          Demo · ${officer ? "officer@pramana.in / officer123" : "trader@pramana.in / trader123"}
          ${!officer ? "<br>Also weigh@pramana.in / trader123 (weighbridge operator)" : "<br>Also lmo.kol@pramana.in / officer123"}
        </div>
      </section>
    </div>`;
}

async function doLogin(role) {
  const err = $("#auth-err");
  err.innerHTML = "";
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ email: $("#em").value, password: $("#pw").value, role }),
    });
    S.user = data.user;
    go(role === "officer" ? "officer-home" : "user-home");
  } catch (e) {
    err.innerHTML = `<div class="err">${e.message}</div>`;
  }
}

async function doLogout() {
  try { await api("/api/logout", { method: "POST", body: "{}" }); } catch {}
  S.user = null;
  go("landing");
}

function shell(nav, body, role) {
  const items = role === "officer" ? [
    ["officer-home", "District desk", "Overview"],
    ["officer-queue", "Verification queue", "Applications"],
    ["officer-inspect", "Field inspection", "MPE + stamp"],
    ["officer-scan", "Photo authenticity", "Genuine vs clone"],
    ["officer-audit", "Audit chain", "Tamper-evident log"],
    ["guidelines", "Rule library", "India + OIML"],
  ] : [
    ["user-home", "My desk", "Overview"],
    ["user-instruments", "My instruments", "Registry"],
    ["user-scan", "Photo authenticity", "Genuine vs third-party"],
    ["user-lab", "Compliance lab", "MPE calculator"],
    ["user-apply", "New application", "First / re-verify"],
    ["guidelines", "Rule library", "India + OIML"],
  ];
  const navBtns = items.map(([id, t, s]) =>
    `<button class="navbtn ${S.view===id?"active":""}" onclick="go('${id}')"><div>${t}<small>${s}</small></div></button>`
  ).join("");
  const u = S.user || {};
  return `
    <div class="app">
      <aside class="side">
        ${brand()}
        ${navBtns}
        <div class="who">
          <b>${u.name || ""}</b>
          ${u.title || u.role}<br>
          <span class="tiny">${u.org || ""} · ${u.district || ""}</span>
          <div class="mt"><button class="btn btn-ghost btn-full" onclick="doLogout()">Sign out</button></div>
        </div>
      </aside>
      <div>
        <div class="mobile-nav">${items.map(([id,t]) => `<button class="linkish" style="color:#eadfcb;border-color:#334" onclick="go('${id}')">${t}</button>`).join("")}</div>
        <div class="main">${body}</div>
      </div>
    </div>`;
}

function kpi(n, l) {
  return `<div class="card kpi"><b>${n}</b><span>${l}</span></div>`;
}

async function userHome() {
  const [inst, apps] = await Promise.all([
    api("/api/instruments"),
    api("/api/applications"),
  ]);
  S.cache.instruments = inst.instruments;
  const list = inst.instruments;
  const nOk = list.filter(i => i.compliance?.verdict === "COMPLIANT").length;
  const nBad = list.filter(i => i.compliance?.verdict === "NON_COMPLIANT").length;
  const nExp = list.filter(i => i.compliance?.verdict === "EXPIRED" || i.status === "expired").length;
  return shell("", `
    <p class="crumb">User window · ${S.user.org}</p>
    <h1>Namaste, ${S.user.name.split(" ")[0]}.</h1>
    <p class="intro">Your weighing and measuring instruments against the Legal Metrology Act, 2009 and OIML R 76. Photograph a part to test if it is original or third-party.</p>
    <div class="grid-4 mb">
      ${kpi(list.length, "Instruments")}
      ${kpi(nOk, "Compliant")}
      ${kpi(nBad, "Non-compliant")}
      ${kpi(nExp, "Expired / due")}
    </div>
    <div class="mb">
      ${photoCheckMarkup({ publicMode: false, compact: true })}
    </div>
    <div class="grid-2">
      <div>
        <div class="card mb">
          <h3>Instruments</h3>
          ${list.map(instrumentRow).join("") || "<p class='tiny'>None yet.</p>"}
          <button class="btn btn-navy mt" onclick="go('user-register')">Register another instrument</button>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Applications</h3>
          <table class="table">
            <thead><tr><th>ID</th><th>Kind</th><th>Status</th></tr></thead>
            <tbody>
              ${apps.applications.map(a => `<tr><td class="mono">${a.public_id}</td><td>${a.kind}</td><td>${chip(a.status)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `, "user");
}

function instrumentRow(i) {
  const src = i.photo ? (i.photo.startsWith("img/") ? "/static/" + i.photo : "/static/" + i.photo) : "/static/img/scale-genuine.jpg";
  return `
    <div class="instrument">
      <img src="${src}" alt="" />
      <div>
        <h4>${i.name}</h4>
        <p class="mono">${i.serial} · ${i.manufacturer || "—"} ${i.model || ""}</p>
        <p>${TYPE_LABEL[i.type] || i.type} · Class ${i.accuracy_class} · Max ${i.max_kg} kg · e=${i.e_value}</p>
        <div class="mt">${chip(i.status)} ${chip(i.oem_status)} ${chip(i.compliance?.verdict)}</div>
      </div>
      <button class="btn btn-ghost" onclick="go('user-instrument', {id:${i.id}})">Open</button>
    </div>`;
}

async function userInstruments() {
  const inst = await api("/api/instruments");
  return shell("", `
    <p class="crumb">User window</p>
    <div class="row"><h1>My instruments</h1><button class="btn btn-saffron right" onclick="go('user-register')">Register new</button></div>
    <p class="intro">Each record carries model approval, accuracy class, stamp quarter and an OEM authenticity flag.</p>
    ${inst.instruments.map(instrumentRow).join("")}
  `, "user");
}

async function userInstrument() {
  const d = await api("/api/instruments/" + S.payload.id);
  const src = d.photo ? "/static/" + d.photo : "";
  const c = d.compliance || {};
  const cert = d.certificate;
  return shell("", `
    <p class="crumb">Instrument · ${d.serial}</p>
    <div class="row"><h1>${d.name}</h1> ${chip(d.status)} ${chip(d.oem_status)}</div>
    <p class="intro">${d.manufacturer} ${d.model} · ${d.premises}</p>
    <div class="grid-2">
      <div>
        <div class="card mb"><img src="${src}" alt="" style="width:100%;border-radius:4px;max-height:280px;object-fit:cover" /></div>
        <div class="card mb">
          <h3>Nameplate</h3>
          <table class="table">
            <tr><th>Serial</th><td class="mono">${d.serial}</td></tr>
            <tr><th>Model approval</th><td class="mono">${d.model_approval || "— missing —"}</td></tr>
            <tr><th>OIML</th><td class="mono">${d.oiml_cert || "—"}</td></tr>
            <tr><th>Class / Max / e / d</th><td>Class ${d.accuracy_class} · ${d.max_kg} kg · e=${d.e_value} · d=${d.d_value} · n=${c.n || "—"}</td></tr>
            <tr><th>Stamp</th><td>${d.stamp_lmo || "—"} ${d.stamp_year || ""} ${d.stamp_quarter || ""}</td></tr>
            <tr><th>Verified</th><td>${d.last_verified || "—"} → due ${d.next_due || "—"}</td></tr>
          </table>
        </div>
      </div>
      <div>
        <div class="verdict-hero ${c.verdict}">
          <h2>${c.verdict.replace("_", " ")}</h2>
          <p>Score ${c.score} · rules ${ (c.rules_applied||[]).join(" · ") }</p>
        </div>
        <div class="card mb">
          <h3>Checks passed</h3>
          <ul>${(c.passed||[]).map(x=>`<li class="ok-text">${x}</li>`).join("") || "<li class='tiny'>None</li>"}</ul>
          <h3>Issues</h3>
          <ul>${(c.issues||[]).map(x=>`<li class="bad-text">${x}</li>`).join("") || "<li class='tiny'>None</li>"}</ul>
        </div>
        ${cert ? `
        <div class="card cert">
          <div class="gov">Government of India · Legal Metrology</div>
          <h2>Certificate of Verification</h2>
          <p style="text-align:center" class="mono">${cert.cert_no}</p>
          <p>Valid ${cert.issued_on} → ${cert.valid_until} · ${chip(cert.status)}</p>
          <p class="tiny">Public verify with this number on the portal. QR resolves server-side — the code itself is not trusted.</p>
        </div>` : `<div class="card"><p>No certificate on file.</p><button class="btn btn-navy" onclick="go('user-apply', {id:${d.id}})">Apply for verification</button></div>`}
        <div class="row mt">
          <button class="btn btn-saffron" onclick="go('user-scan', {serial:'${d.serial}', id:${d.id}})">Photograph this instrument</button>
        </div>
      </div>
    </div>
  `, "user");
}

function registerForm(role = "user") {
  return `
    <p class="crumb">New instrument</p>
    <h1>Register a weight or measure</h1>
    <p class="intro">Capture the nameplate. First verification still requires an officer — this only opens the file.</p>
    <div class="card" style="max-width:640px">
      <div class="field"><label>Display name</label><input id="f-name" placeholder="e.g. Billing counter scale" /></div>
      <div class="field"><label>Serial on nameplate</label><input id="f-serial" class="mono" placeholder="ESS-30K-88291" /></div>
      <div class="grid-2">
        <div class="field"><label>Type</label>
          <select id="f-type">
            ${Object.entries(TYPE_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Accuracy class</label>
          <select id="f-class"><option>III</option><option>II</option><option>I</option><option>IIII</option><option>C3</option><option>0.5</option></select>
        </div>
      </div>
      <div class="grid-3">
        <div class="field"><label>Max (kg)</label><input id="f-max" type="number" value="30" /></div>
        <div class="field"><label>e (kg)</label><input id="f-e" type="number" step="0.001" value="0.005" /></div>
        <div class="field"><label>Year</label><input id="f-year" type="number" value="2026" /></div>
      </div>
      <div class="field"><label>Manufacturer</label><input id="f-mfr" /></div>
      <div class="field"><label>Model</label><input id="f-model" /></div>
      <div class="field"><label>Model approval (IND/09/YYYY/NNN)</label><input id="f-appr" class="mono" /></div>
      <div class="field"><label>Premises</label><input id="f-prem" value="${S.user.org || ""}" /></div>
      <button class="btn btn-saffron" onclick="submitInstrument()">Save to registry</button>
      <div id="reg-err" class="mt"></div>
    </div>`;
}

async function submitInstrument() {
  const box = $("#reg-err");
  try {
    const inst = await api("/api/instruments", {
      method: "POST",
      body: JSON.stringify({
        name: $("#f-name").value,
        serial: $("#f-serial").value,
        type: $("#f-type").value,
        accuracy_class: $("#f-class").value,
        max_kg: $("#f-max").value,
        e_value: $("#f-e").value,
        year_of_make: $("#f-year").value,
        manufacturer: $("#f-mfr").value,
        model: $("#f-model").value,
        model_approval: $("#f-appr").value,
        premises: $("#f-prem").value,
      }),
    });
    go("user-instrument", { id: inst.instrument.id });
  } catch (e) {
    box.innerHTML = `<div class="err">${e.message}</div>`;
  }
}

async function userApply() {
  const inst = await api("/api/instruments");
  const pre = S.payload.id;
  return shell("", `
    <p class="crumb">Application</p>
    <h1>Apply for verification / re-verification</h1>
    <p class="intro">Section 24 of the Act. The officer still makes the legal decision — this file only starts the lifecycle.</p>
    <div class="card" style="max-width:560px">
      <div class="field"><label>Instrument</label>
        <select id="a-inst">${inst.instruments.map(i=>`<option value="${i.id}" ${i.id===pre?"selected":""}>${i.serial} — ${i.name}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Kind</label>
        <select id="a-kind">
          <option value="first_verification">First verification</option>
          <option value="reverification" selected>Re-verification</option>
          <option value="repair">After repair</option>
        </select>
      </div>
      <div class="field"><label>Remarks</label><textarea id="a-note" rows="3"></textarea></div>
      <button class="btn btn-navy" onclick="submitApp()">Submit application</button>
      <div id="a-err" class="mt"></div>
    </div>
  `, "user");
}

async function submitApp() {
  try {
    const r = await api("/api/applications", {
      method: "POST",
      body: JSON.stringify({ instrument_id: $("#a-inst").value, kind: $("#a-kind").value, remarks: $("#a-note").value }),
    });
    $("#a-err").innerHTML = `<div class="card">Filed as <b class="mono">${r.public_id}</b>. Status: submitted.</div>`;
  } catch (e) {
    $("#a-err").innerHTML = `<div class="err">${e.message}</div>`;
  }
}

function photoCheckMarkup(opts = {}) {
  const publicMode = !!opts.publicMode;
  const compact = !!opts.compact;
  return `
    <div class="photo-lab" data-public="${publicMode ? "1" : "0"}">
      ${compact ? `<h3 style="font-family:var(--serif);margin:0 0 6px">Upload a picture, then check</h3>
        <p class="tiny" style="margin-top:0">No login needed. Genuine OEM vs third-party parts, plus Legal Metrology / OIML compliance.</p>` : ""}
      <div class="steps-row">
        <div class="step-pill" id="pill-1"><span class="n">1</span> Upload picture</div>
        <div class="step-pill" id="pill-2"><span class="n">2</span> Tap Check</div>
      </div>
      <div class="grid-2">
        <div>
          <div class="dropzone" id="photo-drop">
            <div id="drop-inner">
              <p style="margin:0 0 6px"><b>Drop a photo here, or choose a file</b></p>
              <p class="tiny">Scale, nameplate, load cell, indicator or lead seal. JPG / PNG.</p>
              <div class="row mt" style="justify-content:center">
                <label class="btn btn-saffron">Upload picture
                  <input id="photo" type="file" accept="image/*" capture="environment" />
                </label>
                <button type="button" class="btn btn-navy" id="cam-btn">Use camera</button>
              </div>
              <p class="tiny mt">Or try a sample:
                <button type="button" class="linkish" data-sample="/static/img/scale-genuine.jpg" data-serial="ESS-30K-88291">Genuine scale</button>
                <button type="button" class="linkish" data-sample="/static/img/scale-fake.jpg" data-serial="UNK-PL-77310">Third-party clone</button>
                <button type="button" class="linkish" data-sample="/static/img/loadcell.jpg" data-serial="LC-C3-99102">Load cell</button>
              </p>
            </div>
          </div>
          <div class="camera-actions" id="cam-wrap"></div>
          <div class="field mt"><label>Serial on nameplate (optional)</label>
            <input id="scan-serial" class="mono" value="${S.payload.serial || ""}" placeholder="ESS-30K-88291" />
          </div>
          <div class="field"><label>What did you photograph?</label>
            <select id="scan-type">
              <option value="electronic_weighing">Complete instrument</option>
              <option value="load_cell">Load cell / sensor</option>
              <option value="indicator">Indicator / head</option>
              <option value="seal">Verification seal / stamp</option>
              <option value="fuel_dispenser">Fuel dispenser meter</option>
            </select>
          </div>
          <button class="btn btn-saffron btn-full" id="check-btn" disabled onclick="runScan()">2 · Check genuine or third-party</button>
        </div>
        <div id="scan-out">
          <div class="scan-stage"><p class="tiny">Step 1: upload a picture. Step 2: tap Check.</p></div>
        </div>
      </div>
    </div>`;
}

function scanPanel(role) {
  return `
    <p class="crumb">${role === "officer" ? "Officer window" : "User window"} · Photo check</p>
    <h1>Upload a picture, then check</h1>
    <p class="intro">Step 1 — photograph the instrument or a spare part. Step 2 — check whether it is genuine OEM or a third-party clone, and whether it follows Indian Legal Metrology rules and OIML R 76 / R 60 / R 117. This does <i>not</i> replace the officer’s legal decision.</p>
    ${photoCheckMarkup({ publicMode: false })}`;
}

function photoCheckPage() {
  return `
    <div class="hero">
      ${topPublic()}
      <p class="kicker">Photo authenticity · no login required</p>
      <h1 class="display">Upload a picture. Then check.</h1>
      <p class="lede">Anyone can drop a photo of a weighing or measuring instrument. PRAMĀṆA returns genuine OEM vs third-party, part-by-part notes, and a compliance reading against the Legal Metrology Act and OIML.</p>
      ${photoCheckMarkup({ publicMode: true })}
    </div>`;
}

let LAST_FILE = null;

function setPhotoFile(file, previewUrl) {
  LAST_FILE = file;
  const drop = $("#photo-drop");
  const pill = $("#pill-1");
  const btn = $("#check-btn");
  if (!file) return;
  const url = previewUrl || URL.createObjectURL(file);
  if (drop) {
    drop.classList.add("has-file");
    const inner = $("#drop-inner");
    if (inner) {
      inner.innerHTML = `
        <img class="preview-frame" src="${url}" alt="Uploaded instrument" />
        <div class="fname">Ready · ${file.name || "photo.jpg"}</div>
        <p class="tiny">Step 1 done. Now tap Check.</p>
        <label class="btn btn-ghost mt">Replace picture<input id="photo" type="file" accept="image/*" capture="environment" /></label>`;
      const input = $("#photo");
      if (input) input.addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) setPhotoFile(f);
      });
    }
  }
  if (pill) pill.classList.add("ready");
  if (btn) btn.disabled = false;
  const out = $("#scan-out");
  if (out) out.innerHTML = `<div class="scan-stage"><img src="${url}" alt="preview" /><div class="scanline"></div></div><p class="tiny mt">Picture uploaded. Tap <b>Check</b> to see if it is genuine or third-party.</p>`;
}

function bindPhotoCheck() {
  const drop = $("#photo-drop");
  if (!drop) return;
  LAST_FILE = null;
  const input = $("#photo");
  if (input) input.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setPhotoFile(f);
  });
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.add("hot");
  }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, (e) => {
    e.preventDefault(); drop.classList.remove("hot");
  }));
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setPhotoFile(f);
  });
  const cam = $("#cam-btn");
  if (cam) cam.addEventListener("click", startCam);
  drop.querySelectorAll("[data-sample]").forEach(b => {
    b.addEventListener("click", () => useSample(b.dataset.sample, b.dataset.serial));
  });
}

async function useSample(url, serial) {
  const ser = $("#scan-serial");
  if (ser) ser.value = serial;
  const blob = await fetch(url).then(r => r.blob());
  const file = new File([blob], url.split("/").pop(), { type: blob.type || "image/jpeg" });
  setPhotoFile(file, url);
}

async function startCam() {
  const wrap = $("#cam-wrap");
  wrap.innerHTML = `<video id="vid" autoplay playsinline></video><button class="btn btn-saffron mt" type="button" onclick="snapCam()">Capture picture</button>`;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    $("#vid").srcObject = stream;
  } catch {
    wrap.innerHTML = `<div class="err">Camera permission denied — use Upload picture instead.</div>`;
  }
}

function snapCam() {
  const vid = $("#vid");
  const c = document.createElement("canvas");
  c.width = vid.videoWidth || 640;
  c.height = vid.videoHeight || 480;
  c.getContext("2d").drawImage(vid, 0, 0);
  c.toBlob((blob) => {
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    setPhotoFile(file);
    const s = vid.srcObject;
    if (s) s.getTracks().forEach(t => t.stop());
    $("#cam-wrap").innerHTML = "";
  }, "image/jpeg", 0.9);
}

async function runScan() {
  const out = $("#scan-out");
  const pill2 = $("#pill-2");
  if (!LAST_FILE) {
    out.innerHTML = `<div class="err">Step 1 first: upload a picture, then tap Check.</div>`;
    return;
  }
  if (pill2) pill2.classList.add("ready");
  out.innerHTML = `<div class="scan-stage"><p>Checking nameplate · stamp · seal · OEM marks…</p><div class="scanline"></div></div>
    <ul class="steps">
      <li><span class="dot on"></span> Image quality</li>
      <li><span class="dot on"></span> Instrument / part classification</li>
      <li><span class="dot on"></span> OEM fingerprint vs clone references</li>
      <li><span class="dot on"></span> Serial registry + model approval</li>
      <li><span class="dot on"></span> Legal Metrology + OIML compliance engine</li>
    </ul>`;
  const fd = new FormData();
  fd.append("photo", LAST_FILE);
  fd.append("serial", ($("#scan-serial") && $("#scan-serial").value) || "");
  fd.append("claimed_type", ($("#scan-type") && $("#scan-type").value) || "electronic_weighing");
  if (S.payload.id) fd.append("instrument_id", S.payload.id);
  const lab = document.querySelector(".photo-lab");
  const publicMode = lab && lab.dataset.public === "1";
  const path = publicMode || !S.user ? "/api/public/analyze" : "/api/analyze";
  try {
    const r = await api(path, { method: "POST", body: fd });
    renderScan(r);
  } catch (e) {
    out.innerHTML = `<div class="err">${e.message}</div>`;
  }
}

function renderScan(r) {
  const parts = (r.parts || []).map(p => `
    <div class="part"><div><b>${p.part}</b><div class="tiny">${p.note}</div></div>${chip(p.status)}</div>`).join("");
  const c = r.compliance || {};
  $("#scan-out").innerHTML = `
    <div class="verdict-hero ${r.label}">
      <h2>${r.headline}</h2>
      <p>Confidence ${r.confidence}% · visual nearest ${r.nearest_reference || "none"} (distance ${r.hamming})</p>
    </div>
    <div class="card mb">
      <img src="${r.photo_url}" alt="" style="width:100%;border-radius:4px;max-height:220px;object-fit:cover" />
      <h3 class="mt">Forensic notes</h3>
      <ul>${(r.flags||[]).map(f=>`<li>${f}</li>`).join("")}</ul>
    </div>
    <div class="card mb"><h3>Parts</h3>${parts}</div>
    <div class="card">
      <h3>Compliance engine · ${c.verdict || "—"}</h3>
      <ul>${(c.passed||[]).map(x=>`<li class="ok-text">${x}</li>`).join("")}</ul>
      <ul>${(c.issues||[]).map(x=>`<li class="bad-text">${x}</li>`).join("")}</ul>
      <p class="tiny">${(c.rules_applied||[]).join(" · ")}</p>
    </div>`;
}

async function userLab() {
  return shell("", `
    <p class="crumb">Compliance laboratory</p>
    <h1>Will this instrument pass?</h1>
    <p class="intro">Enter nameplate data and an observed error. The engine applies OIML R 76 MPE bands (verification vs in-service) and Indian re-verification intervals from Rule 27.</p>
    <div class="grid-2">
      <div class="card">
        <div class="grid-2">
          <div class="field"><label>Class</label>
            <select id="c-class"><option>III</option><option>II</option><option>I</option><option>IIII</option></select></div>
          <div class="field"><label>Type</label>
            <select id="c-type">${Object.entries(TYPE_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div>
        </div>
        <div class="grid-3">
          <div class="field"><label>Max kg</label><input id="c-max" type="number" value="30" /></div>
          <div class="field"><label>e kg</label><input id="c-e" type="number" step="0.001" value="0.005" /></div>
          <div class="field"><label>Load kg</label><input id="c-load" type="number" value="10" /></div>
        </div>
        <div class="field"><label>Observed error in e (e.g. 0.8 means 0.8e)</label><input id="c-err" type="number" step="0.1" value="0.8" /></div>
        <div class="field"><label>Model approval</label><input id="c-appr" value="IND/09/2019/214" /></div>
        <div class="field"><label>OEM status</label>
          <select id="c-oem"><option value="genuine">Genuine</option><option value="third_party">Third-party</option><option value="unknown">Unknown</option></select></div>
        <div class="field"><label>Next due (YYYY-MM-DD)</label><input id="c-due" value="2027-04-18" /></div>
        <div class="field"><label>Stamp LMO / year / quarter</label>
          <div class="row">
            <input id="c-lmo" value="LMO-MH-4412" />
            <input id="c-year" value="2026" style="width:90px" />
            <input id="c-q" value="B" style="width:70px" />
          </div>
        </div>
        <button class="btn btn-saffron" onclick="runLab()">Run engine</button>
      </div>
      <div id="lab-out" class=ffron" onclick="runLab()">Run engine</button>
      </div>
      <div id="lab-out" class="card"><p class="tiny">Results appear here.</p></div>
    </div>
  `, "user");
}

async function runLab() {
  const r = await api("/api/compliance-check", {
    method: "POST",
    body: JSON.stringify({
      accuracy_class: $("#c-class").value,
      type: $("#c-type").value,
      max_kg: $("#c-max").value,
      e_value: $("#c-e").value,
      load_kg: $("#c-load").value,
      error_e: $("#c-err").value,
      model_approval: $("#c-appr").value,
      oem_status: $("#c-oem").value,
      next_due: $("#c-due").value,
      stamp_lmo: $("#c-lmo").value,
      stamp_year: $("#c-year").value,
      stamp_quarter: $("#c-q").value,
      status: "verified",
    }),
  });
  $("#lab-out").innerHTML = `
    <div class="verdict-hero ${r.verdict}"><h2>${r.verdict.replace("_"," ")}</h2><p>Score ${r.score} · n = ${r.n}</p></div>
    ${r.mpe ? `<p>At ${r.mpe.load_kg} kg ( ${r.mpe.load_e} e ) error ${r.mpe.error_e}e vs verification MPE ±${r.mpe.mpe_e_verification}e
      (${r.mpe.pass_verification ? "PASS" : "FAIL"}). In-service MPE is ±${r.mpe.mpe_e_inservice}e.</p>` : ""}
    <ul>${r.passed.map(x=>`<li class="ok-text">${x}</li>`).join("")}</ul>
    <ul>${r.issues.map(x=>`<li class="bad-text">${x}</li>`).join("")}</ul>
    <p class="tiny">${r.rules_applied.join(" · ")}</p>`;
}

async function officerHome() {
  const [st, inst, apps] = await Promise.all([
    api("/api/stats"),
    api("/api/instruments"),
    api("/api/applications"),
  ]);
  return shell("", `
    <p class="crumb">Officer window · ${S.user.lmo_code} · ${S.user.zone}</p>
    <h1>District verification desk</h1>
    <p class="intro">All instruments in the synthetic registry. Schedule inspections, record MPE, stamp, or fail third-party parts.</p>
    <div class="grid-4 mb">
      ${kpi(st.instruments, "Instruments")}
      ${kpi(st.due_soon, "Due within 30 days")}
      ${kpi(st.by_oem.third_party || 0, "Third-party flagged")}
      ${kpi(st.audits, "Audit events")}
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Queue</h3>
        <table class="table">
          <thead><tr><th>Application</th><th>Instrument</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${apps.applications.map(a => `<tr>
              <td class="mono">${a.public_id}</td>
              <td>${a.serial}<div class="tiny">${a.premises || ""}</div></td>
              <td>${chip(a.status)}</td>
              <td><button class="btn btn-ghost" onclick="go('officer-inspect', {iid:${a.instrument_id}, aid:${a.id}})">Inspect</button></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3>Registry snapshot</h3>
        ${inst.instruments.map(i => `
          <div class="part">
            <div><b>${i.serial}</b><div class="tiny">${i.name} · ${i.premises}</div></div>
            <div>${chip(i.status)} ${chip(i.oem_status)}</div>
          </div>`).join("")}
      </div>
    </div>
  `, "officer");
}

async function officerQueue() {
  const apps = await api("/api/applications");
  return shell("", `
    <p class="crumb">Officer window</p>
    <h1>Verification queue</h1>
    <div class="card">
      <table class="table">
        <thead><tr><th>ID</th><th>Kind</th><th>Applicant</th><th>Instrument</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${apps.applications.map(a => `<tr>
            <td class="mono">${a.public_id}</td>
            <td>${a.kind}</td>
            <td>${a.applicant_name || ""}<div class="tiny">${a.org || ""}</div></td>
            <td class="mono">${a.serial}<div class="tiny">${a.instrument_name}</div></td>
            <td>${chip(a.status)}</td>
            <td>
              <button class="btn btn-ghost" onclick="assignApp(${a.id})">Take</button>
              <button class="btn btn-navy" onclick="go('officer-inspect', {iid:${a.instrument_id}, aid:${a.id}})">Field sheet</button>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `, "officer");
}

async function assignApp(id) {
  await api("/api/applications/" + id + "/assign", { method: "POST", body: "{}" });
  go("officer-queue");
}

async function officerInspect() {
  const insts = await api("/api/instruments");
  const selected = S.payload.iid || (insts.instruments[0] && insts.instruments[0].id);
  const d = selected ? await api("/api/instruments/" + selected) : insts.instruments[0];
  const e = d.e_value || 0.005;
  const max = d.max_kg || 30;
  const loads = [0, Math.min(max, 500 * e), Math.min(max, 2000 * e), max].map(x => +x.toFixed(3));
  return shell("", `
    <p class="crumb">Field inspection · ${S.user.lmo_code}</p>
    <h1>Verification test sheet</h1>
    <p class="intro">OIML R 76 increasing-load test. Record indicated weight at each load. Geo and seal evidence travel with the verdict. A pass stamps the instrument and issues a certificate.</p>
    <div class="grid-2">
      <div>
        <div class="field"><label>Instrument</label>
          <select id="i-sel" onchange="go('officer-inspect', {iid: this.value, aid: ${S.payload.aid || 'null'}})">
            ${insts.instruments.map(i=>`<option value="${i.id}" ${i.id===d.id?"selected":""}>${i.serial} — ${i.name}</option>`).join("")}
          </select>
        </div>
        <div class="card mb">
          <p class="mono">${d.serial}</p>
          <p>${d.manufacturer} ${d.model} · Class ${d.accuracy_class} · e=${d.e_value} · Max ${d.max_kg} kg</p>
          <p>${chip(d.status)} ${chip(d.oem_status)} · approval ${d.model_approval || "none"}</p>
        </div>
        <div class="card">
          <h3>Increasing load (verification MPE)</h3>
          <table class="table">
            <thead><tr><th>Applied kg</th><th>Indicated kg</th></tr></thead>
            <tbody>
              ${loads.map((L, idx) => `<tr><td class="mono">${L}</td><td><input id="t${idx}" type="number" step="0.001" value="${L}" /></td></tr>`).join("")}
            </tbody>
          </table>
          <input type="hidden" id="t-n" value="${loads.length}" />
          <input type="hidden" id="t-loads" value="${loads.join(",")}" />
          <div class="field mt"><label>Seal intact?</label>
            <select id="i-seal"><option value="1">Yes — lead / wire seal present</option><option value="0">No — broken or missing</option></select>
          </div>
          <div class="field"><label>Stamp pattern (LMO + year + quarter) acceptable?</label>
            <select id="i-stamp"><option value="1">Yes</option><option value="0">No</option></select>
          </div>
          <div class="field"><label>OEM / parts</label>
            <select id="i-oem">
              <option value="genuine" ${d.oem_status==="genuine"?"selected":""}>Genuine approved model</option>
              <option value="third_party" ${d.oem_status==="third_party"?"selected":""}>Third-party / clone parts</option>
            </select>
          </div>
          <div class="field"><label>Latitude / longitude (auto if allowed)</label>
            <div class="row"><input id="i-lat" placeholder="lat" value="${d.lat || ""}" /><input id="i-lng" placeholder="lng" value="${d.lng || ""}" /></div>
          </div>
          <div class="field"><label>Notes</label><textarea id="i-notes" rows="3">${d.notes || ""}</textarea></div>
          <div class="row">
            <button class="btn btn-ok" onclick="submitInspect('pass')">Pass &amp; stamp</button>
            <button class="btn btn-danger" onclick="submitInspect('fail')">Fail / reject</button>
          </div>
          <div id="i-out" class="mt"></div>
        </div>
      </div>
      <div>
        <img src="/static/${d.photo || "img/scale-genuine.jpg"}" alt="" style="width:100%;border-radius:6px" />
        <div class="card mt">
          <h3>Rule reminder</h3>
          <p class="tiny">Class ${d.accuracy_class} verification MPE is ±0.5e / ±1.0e / ±1.5e by load band. In-service MPE is twice that. Third-party substitution of a load cell or indicator fails model approval even if the error is small. Broken seal ⇒ presumed tampering until re-verified.</p>
        </div>
      </div>
    </div>
  `, "officer");
}

async function submitInspect(verdict) {
  const n = +$("#t-n").value;
  const loads = $("#t-loads").value.split(",").map(Number);
  const tests = [];
  for (let i = 0; i < n; i++) {
    tests.push({ load_kg: loads[i], indicated: +$("#t" + i).value });
  }
  const body = {
    instrument_id: $("#i-sel").value,
    application_id: S.payload.aid || null,
    tests,
    seal_intact: $("#i-seal").value === "1",
    stamp_ok: $("#i-stamp").value === "1",
    oem: $("#i-oem").value,
    lat: parseFloat($("#i-lat").value) || null,
    lng: parseFloat($("#i-lng").value) || null,
    notes: $("#i-notes").value,
    verdict,
  };
  try {
    const r = await api("/api/inspect", { method: "POST", body: JSON.stringify(body) });
    const rows = r.tests.map(t => `<tr><td>${t.load_kg}</td><td>${t.indicated}</td><td>${t.error_e} e</td><td>±${t.mpe_e} e</td><td>${t.pass ? chip("pass") : chip("fail")}</td></tr>`).join("");
    $("#i-out").innerHTML = `
      <div class="verdict-hero ${r.verdict === "pass" ? "COMPLIANT" : "NON_COMPLIANT"}">
        <h2>${r.verdict === "pass" ? "Stamped & certified" : "Failed"}</h2>
        <p>${r.cert_no ? "Certificate " + r.cert_no + " valid until " + r.valid_until : "Instrument not legal for trade."}</p>
      </div>
      <table class="table"><thead><tr><th>Load</th><th>Indicated</th><th>Error</th><th>MPE</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch (e) {
    $("#i-out").innerHTML = `<div class="err">${e.message}</div>`;
  }
}

async function officerAudit() {
  const a = await api("/api/audit");
  return shell("", `
    <p class="crumb">Cybersecurity · chained log</p>
    <h1>Tamper-evident audit trail</h1>
    <p class="intro">Each event hashes the previous digest. Altering history breaks the chain. This is a cryptographic log, not a blockchain product claim.</p>
    <div class="card">
      <table class="table">
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Digest</th></tr></thead>
        <tbody>
          ${a.events.map(e => `<tr>
            <td class="tiny">${e.ts}</td>
            <td>${e.actor_name || "system"}<div class="tiny">${e.actor_role || ""}</div></td>
            <td class="mono">${e.action}</td>
            <td>${e.entity} ${e.entity_id || ""}</td>
            <td class="hash">${(e.chain_hash || "").slice(0, 20)}…</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `, "officer");
}

async function publicView() {
  const q0 = S.payload.q || "";
  let result = "";
  if (q0) {
    try {
      const d = await api("/api/public/verify?q=" + encodeURIComponent(q0));
      if (!d.found) {
        result = `<div class="verdict-hero NON_COMPLIANT"><h2>Not on the registry</h2><p>${d.note}</p></div>`;
      } else {
        result = `
          <div class="verdict-hero ${d.compliance.verdict}">
            <h2>${d.compliance.verdict.replace("_", " ")}</h2>
            <p>${d.manufacturer} ${d.model} · ${d.serial} · ${d.oem_status === "genuine" ? "Genuine OEM" : d.oem_status === "third_party" ? "Third-party / unapproved" : "OEM unknown"}</p>
          </div>
          <div class="grid-2">
            <div class="card">
              <img src="/static/${d.photo || "img/scale-genuine.jpg"}" alt="" style="width:100%;border-radius:4px" />
              <table class="table">
                <tr><th>Premises</th><td>${d.premises}, ${d.district}, ${d.state}</td></tr>
                <tr><th>Class</th><td>${d.accuracy_class}</td></tr>
                <tr><th>Model approval</th><td class="mono">${d.model_approval || "—"}</td></tr>
                <tr><th>Stamp</th><td>${d.stamp_lmo || "—"} ${d.stamp_year || ""} ${d.stamp_quarter || ""}</td></tr>
                <tr><th>Valid</th><td>${d.last_verified || "—"} → ${d.next_due || "—"}</td></tr>
                <tr><th>Certificate</th><td class="mono">${d.certificate ? d.certificate.cert_no : "—"}</td></tr>
              </table>
            </div>
            <div class="card">
              <h3>Why this verdict</h3>
              <ul>${(d.compliance.passed||[]).map(x=>`<li class="ok-text">${x}</li>`).join("")}</ul>
              <ul>${(d.compliance.issues||[]).map(x=>`<li class="bad-text">${x}</li>`).join("")}</ul>
              <p class="tiny">A citizen should look for the LMO stamp (officer + year + quarter A/B/C/D) and a displayed certificate. Broken seals are presumed tampering.</p>
            </div>
          </div>`;
      }
    } catch (e) {
      result = `<div class="err">${e.message}</div>`;
    }
  }
  return `
    <div class="hero">
      ${topPublic()}
      <p class="kicker">Public verification · no login</p>
      <h1 class="display">Check a certificate or serial</h1>
      <p class="lede">The portal asks the server; it does not trust whatever is printed inside a QR code.</p>
      <div class="public-strip">
        <div><h3>Look up</h3><p>Certificate no., serial or QR token</p></div>
        <input id="pubq" value="${q0}" placeholder="ESS-30K-88291" />
        <button class="btn btn-saffron" onclick="go('public', {q: document.getElementById('pubq').value})">Verify</button>
      </div>
      <p class="tiny mt">Try ESS-30K-88291 (genuine, valid) · UNK-PL-77310 (third-party, rejected) · AWTX-50T-1902 (due) · CNT-BM-1102 (expired beam scale)</p>
      <div class="mt">${result}</div>
      <h2 class="mt" style="font-family:var(--serif)">Or upload a picture and check</h2>
      ${photoCheckMarkup({ publicMode: true })}
    </div>`;
}

async function guidelinesView() {
  const g = await api("/api/guidelines");
  const inner = g.guidelines.map(x => `
    <article class="guide">
      <div class="jur">${x.jurisdiction} · ${x.id}</div>
      <h3>${x.title}</h3>
      <p>${x.body}</p>
      <p class="tiny">${x.refs.join(" · ")}</p>
    </article>`).join("");
  const months = Object.entries(g.reverify_months).map(([k,v]) => `<tr><td>${TYPE_LABEL[k] || k}</td><td>${v} months</td></tr>`).join("");
  const body = `
    <p class="crumb">Rule library</p>
    <h1>Indian law and international recommendations</h1>
    <p class="intro">PRAMĀṆA does not invent tolerances. It applies the Legal Metrology Act, the 2011 General Rules, model-approval rules, and OIML R 76 / R 60 / R 117.</p>
    <div class="grid-2">
      <div>${inner}</div>
      <div>
        <div class="card mb">
          <h3>Rule 27 re-verification</h3>
          <table class="table"><thead><tr><th>Instrument</th><th>Cycle</th></tr></thead><tbody>${months}</tbody></table>
        </div>
        <div class="card">
          <h3>OIML R 76 MPE (verification)</h3>
          <p class="tiny">In-service MPE = 2 × these values.</p>
          ${Object.entries(g.mpe_bands).map(([cls, bands]) =>
            `<p><b>Class ${cls}</b><br>${bands.map(b=>`${b[0]}e – ${b[1]===1e12?"∞":b[1]+"e"} : ±${b[2]}e`).join("<br>")}</p>`
          ).join("")}
        </div>
      </div>
    </div>`;
  if (S.user) return shell("", body, S.user.role);
  return `<div class="hero">${topPublic()}${body}</div>`;
}

const VIEWS = {
  landing: () => landing(),
  "login-user": () => loginView("user"),
  "login-officer": () => loginView("officer"),
  "photo-check": photoCheckPage,
  public: publicView,
  guidelines: guidelinesView,
  "user-home": userHome,
  "user-instruments": userInstruments,
  "user-instrument": userInstrument,
  "user-register": async () => shell("", registerForm(), "user"),
  "user-apply": userApply,
  "user-scan": async () => shell("", scanPanel("user"), "user"),
  "user-lab": userLab,
  "officer-home": officerHome,
  "officer-queue": officerQueue,
  "officer-inspect": officerInspect,
  "officer-scan": async () => shell("", scanPanel("officer"), "officer"),
  "officer-audit": officerAudit,
};

async function render() {
  const fn = VIEWS[S.view] || VIEWS.landing;
  try {
    const html = await fn();
    app.innerHTML = html;
    bindPhotoCheck();
  } catch (e) {
    if (String(e.message).includes("Authentication")) {
      S.user = null;
      app.innerHTML = loginView("user");
      return;
    }
    app.innerHTML = `<div class="hero">${topPublic()}<div class="err">${e.message}</div></div>`;
  }
}

(async function boot() {
  const h = location.hash.replace("#", "");
  if (h) S.view = h;
  try {
    const me = await api("/api/me");
    S.user = me.user;
    if (S.view === "landing" || S.view.startsWith("login")) {
      S.view = S.user.role === "officer" ? "officer-home" : "user-home";
    }
  } catch {}
  render();
})();

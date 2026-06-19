const tabs = [
  { key: "informacoes", label: "Informações" },
  { key: "literatura", label: "Literatura" },
  { key: "musica", label: "Música" },
  { key: "midia", label: "Mídia" }
];

const editableTabs = ["literatura", "musica", "midia"];
const localStorageKey = "atlas-lusofonia-dados-editados";
const urlParams = new URLSearchParams(window.location.search);
const isLearnerMode = urlParams.get("modo") === "aprendiz" || urlParams.has("aprendiz");

let baseCountries = [];
let countries = [];
let selectedCountry = null;
let activeTab = "informacoes";
let map;
const markers = new Map();
const highlightCircles = new Map();

const detailsEl = document.querySelector("#details");
const countryListEl = document.querySelector("#countryList");
const searchInput = document.querySelector("#searchInput");
const searchResultsEl = document.querySelector("#searchResults");
const modalEl = document.querySelector("#contentModal");
const modalBodyEl = document.querySelector("#modalBody");
const closeModalButton = document.querySelector("#closeModal");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  baseCountries = await loadCountries();
  countries = loadEditedCountries() || prepareCountries(baseCountries);
  buildMap();
  renderCountryList();
  bindSearch();
  bindModal();
  document.querySelector("#resetMap").addEventListener("click", fitAllCountries);
}

// Carrega o JSON externo; se o navegador bloquear file://, usa a cópia local embutida no HTML.
async function loadCountries() {
  try {
    const response = await fetch("data/paises.json", { cache: "no-store" });
    if (!response.ok) throw new Error("JSON indisponível");
    return await response.json();
  } catch (error) {
    const fallback = document.querySelector("#fallbackData").textContent;
    return JSON.parse(fallback);
  }
}

function loadEditedCountries() {
  try {
    const saved = JSON.parse(localStorage.getItem(localStorageKey));
    return Array.isArray(saved) ? prepareCountries(saved) : null;
  } catch (error) {
    return null;
  }
}

function saveEditedCountries() {
  localStorage.setItem(localStorageKey, JSON.stringify(countries));
}

function prepareCountries(sourceCountries) {
  return sourceCountries.map((country) => {
    const nextCountry = structuredClone(country);
    nextCountry.midia = [
      ...(nextCountry.midia || []),
      ...(nextCountry.jornais || []),
      ...(nextCountry.tv || [])
    ];
    return nextCountry;
  });
}

function refreshDataAfterEdit() {
  if (selectedCountry) {
    selectedCountry = countries.find((country) => country.id === selectedCountry.id);
    renderDetails();
  }
}

function buildMap() {
  map = L.map("map", {
    zoomControl: false,
    worldCopyJump: true
  }).setView([3, -18], 2);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 8,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  countries.forEach((country) => {
    const circle = L.circleMarker(country.coordenadasCapital, {
      color: "#0f766e",
      weight: 2,
      fillColor: "#0f766e",
      fillOpacity: 0.2,
      radius: 18
    })
      .addTo(map)
      .bindPopup(`<strong>${country.bandeira} ${country.nome}</strong><br>${country.capital}`)
      .on("click", () => selectCountry(country.id));

    const marker = L.marker(country.coordenadasCapital, {
      title: `${country.capital}, ${country.nome}`,
      icon: L.divIcon({
        className: "",
        html: `<span class="capital-marker">${country.bandeira}</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    })
      .addTo(map)
      .bindPopup(`<strong>${country.capital}</strong><br>${country.nome}`)
      .on("click", () => selectCountry(country.id));

    highlightCircles.set(country.id, circle);
    markers.set(country.id, marker);
  });

  fitAllCountries();
}

function fitAllCountries() {
  const group = L.featureGroup([...highlightCircles.values(), ...markers.values()]);
  map.fitBounds(group.getBounds().pad(0.25));
}

function renderCountryList() {
  countryListEl.innerHTML = countries
    .map((country) => `
      <button class="country-button ${selectedCountry?.id === country.id ? "active" : ""}" type="button" data-id="${country.id}">
        ${country.bandeira} ${country.nome}
      </button>
    `)
    .join("");

  countryListEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => selectCountry(button.dataset.id));
  });
}

function selectCountry(countryId) {
  selectedCountry = countries.find((country) => country.id === countryId);
  activeTab = "informacoes";
  updateActiveMapLayer();
  renderCountryList();
  renderDetails();

  const marker = markers.get(countryId);
  if (marker) {
    map.flyTo(selectedCountry.coordenadasCapital, selectedCountry.id === "brasil" ? 4 : 6, {
      duration: 0.9
    });
    marker.openPopup();
  }
}

function updateActiveMapLayer() {
  highlightCircles.forEach((circle, id) => {
    const isActive = selectedCountry && selectedCountry.id === id;
    circle.setStyle({
      fillOpacity: isActive ? 0.36 : 0.2,
      weight: isActive ? 3 : 2,
      color: isActive ? "#bf7d24" : "#0f766e",
      fillColor: isActive ? "#bf7d24" : "#0f766e"
    });
    circle.setRadius(isActive ? 24 : 18);
  });
}

function renderDetails() {
  if (!selectedCountry) return;

  detailsEl.innerHTML = `
    <div class="country-heading">
      <div>
        <h2>${selectedCountry.nome}</h2>
        <p class="summary">${selectedCountry.resumo}</p>
      </div>
      <span class="flag" aria-hidden="true">${selectedCountry.bandeira}</span>
    </div>

    <div class="meta-grid">
      ${metaCard("Capital", selectedCountry.capital)}
      ${metaCard("Continente", selectedCountry.continente)}
      ${metaCard("Língua oficial", selectedCountry.lingua)}
      ${metaCard("Moeda", selectedCountry.moeda)}
    </div>

    <div class="tabs" role="tablist">
      ${tabs.map((tab) => `
        <button class="tab-button ${activeTab === tab.key ? "active" : ""}" type="button" data-tab="${tab.key}">
          ${tab.label}
        </button>
      `).join("")}
    </div>

    <div id="tabContent">${renderTabContent(selectedCountry, activeTab)}</div>
  `;

  detailsEl.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderDetails();
    });
  });

  detailsEl.querySelectorAll("[data-open-item]").forEach((button) => {
    button.addEventListener("click", () => openItemModal(activeTab, Number(button.dataset.openItem)));
  });

  detailsEl.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => fillLearnerFormForEdit(Number(button.dataset.editItem)));
  });

  const learnerForm = detailsEl.querySelector("#learnerForm");
  if (learnerForm) {
    learnerForm.addEventListener("submit", handleLearnerSubmit);
    bindRichEditor(learnerForm);
  }

  const exportButton = detailsEl.querySelector("#exportJson");
  if (exportButton) {
    exportButton.addEventListener("click", exportMergedJson);
  }

  const clearButton = detailsEl.querySelector("#clearLocalData");
  if (clearButton) {
    clearButton.addEventListener("click", clearLocalLearnerData);
  }
}

function metaCard(label, value) {
  return `
    <article class="meta-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderTabContent(country, tabKey) {
  if (tabKey === "informacoes") {
    return `
      <div class="content-card">
        <h3>Perfil cultural</h3>
        <p>${country.resumo}</p>
        <p><strong>Capital:</strong> ${country.capital}<br><strong>Continente:</strong> ${country.continente}<br><strong>Língua:</strong> ${country.lingua}<br><strong>Moeda:</strong> ${country.moeda}</p>
      </div>
    `;
  }

  const items = country[tabKey] || [];
  return `
    <div class="content-list">
      ${items.map((item, index) => contentCard(item, index)).join("")}
    </div>
    ${learnerPanel(tabKey)}
  `;
}

function contentCard(item, index) {
  if (typeof item === "string") {
    item = {
      nome: "Curiosidade linguística",
      descricao: item,
      texto: item
    };
  }

  const title = item.nome || item.artista || item.titulo || "Item cultural";
  const description = item.descricao ? `<p>${item.descricao}</p>` : "";
  const image = item.imagem
    ? `<img src="${item.imagem}" alt="${title}" loading="lazy">`
    : `<div class="card-letter" aria-hidden="true">${title.charAt(0)}</div>`;

  return `
    <article class="content-card content-card-entry">
      <button class="content-card-button" type="button" data-open-item="${index}">
        <div class="card-media">${image}</div>
        <div>
          <h3>${title}</h3>
          ${description}
          <span>Ver detalhes</span>
        </div>
      </button>
      ${isLearnerMode ? `<button class="edit-item-button" type="button" data-edit-item="${index}">Editar</button>` : ""}
    </article>
  `;
}

function learnerPanel(tabKey) {
  if (!isLearnerMode) return "";

  const label = tabs.find((tab) => tab.key === tabKey)?.label || "aba";

  return `
    <section class="learner-panel">
      <h3>Área do aprendiz</h3>
      <p>Adicione conteúdo em ${label}. Ele aparece para o público neste navegador e pode ser exportado para atualizar o JSON do site.</p>

      <form id="learnerForm" class="learner-form">
        <input name="editIndex" type="hidden">
        <input name="nome" type="text" placeholder="Nome do escritor, músico, jornal, canal ou projeto" required>
        <textarea name="descricao" rows="2" placeholder="Descrição curta para o cartão" required></textarea>
        <input name="textoHtml" type="hidden">
        <div class="editor-shell">
          <div class="editor-toolbar" aria-label="Ferramentas do texto">
            <button type="button" data-command="bold">B</button>
            <button type="button" data-command="italic">I</button>
            <button type="button" data-command="justifyLeft">Esq.</button>
            <button type="button" data-command="justifyCenter">Centro</button>
            <button type="button" data-command="justifyRight">Dir.</button>
            <button type="button" data-action="link">Link</button>
            <button type="button" data-action="image">Imagem</button>
          </div>
          <div id="richEditor" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Texto maior para a janela de detalhes. Você pode colar imagens, formatar texto e inserir hiperlinks."></div>
        </div>
        <input name="imagem" type="url" placeholder="URL da foto ou imagem">
        <input name="link" type="url" placeholder="Link externo">
        <input name="linkTitulo" type="text" placeholder="Título do link">
        <button id="saveLearnerItem" type="submit">Adicionar à aba</button>
      </form>

      <div class="learner-actions">
        <button id="exportJson" type="button">Exportar JSON atualizado</button>
        <button id="clearLocalData" type="button">Restaurar dados iniciais</button>
      </div>
    </section>
  `;
}

function handleLearnerSubmit(event) {
  event.preventDefault();
  if (!selectedCountry || !editableTabs.includes(activeTab)) return;

  const form = event.currentTarget;
  const editor = form.querySelector("#richEditor");
  form.querySelector("[name='textoHtml']").value = editor.innerHTML.trim();
  const formData = new FormData(form);
  const editIndex = formData.get("editIndex");
  const link = formData.get("link").trim();
  const linkTitle = formData.get("linkTitulo").trim();

  const newItem = {
    nome: formData.get("nome").trim(),
    descricao: formData.get("descricao").trim(),
    textoHtml: formData.get("textoHtml").trim(),
    imagem: formData.get("imagem").trim(),
    link,
    linkTitulo: linkTitle
  };

  Object.keys(newItem).forEach((key) => {
    if (!newItem[key] || (Array.isArray(newItem[key]) && !newItem[key].length)) {
      delete newItem[key];
    }
  });

  selectedCountry[activeTab] ??= [];
  if (editIndex !== "") {
    selectedCountry[activeTab][Number(editIndex)] = newItem;
  } else {
    selectedCountry[activeTab].push(newItem);
  }

  saveEditedCountries();
  form.reset();
  editor.innerHTML = "";
  form.querySelector("[name='editIndex']").value = "";
  form.querySelector("#saveLearnerItem").textContent = "Adicionar à aba";
  refreshDataAfterEdit();
}

function exportMergedJson() {
  const json = JSON.stringify(countries, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "paises-atualizado.json";
  link.click();
  URL.revokeObjectURL(url);
}

function clearLocalLearnerData() {
  localStorage.removeItem(localStorageKey);
  countries = prepareCountries(baseCountries);
  refreshDataAfterEdit();
}

function fillLearnerFormForEdit(index) {
  if (!selectedCountry || !editableTabs.includes(activeTab)) return;
  const item = selectedCountry[activeTab]?.[index];
  if (!item) return;

  const form = detailsEl.querySelector("#learnerForm");
  if (!form) return;

  const links = getItemLinks(item);
  form.querySelector("[name='editIndex']").value = String(index);
  form.querySelector("[name='nome']").value = item.nome || item.artista || item.titulo || "";
  form.querySelector("[name='descricao']").value = item.descricao || "";
  form.querySelector("#richEditor").innerHTML = item.textoHtml || item.texto || "";
  form.querySelector("[name='imagem']").value = item.imagem || "";
  form.querySelector("[name='link']").value = links[0]?.url || "";
  form.querySelector("[name='linkTitulo']").value = links[0]?.titulo || "";
  form.querySelector("#saveLearnerItem").textContent = "Salvar edição";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindModal() {
  closeModalButton.addEventListener("click", closeModal);
  modalEl.addEventListener("click", (event) => {
    if (event.target === modalEl) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalEl.hidden) closeModal();
  });
}

function openItemModal(tabKey, index) {
  if (!selectedCountry) return;
  let item = selectedCountry[tabKey]?.[index];
  if (!item) return;
  if (typeof item === "string") {
    item = {
      nome: "Curiosidade linguística",
      descricao: item,
      texto: item
    };
  }

  const title = item.nome || item.artista || item.titulo || "Item cultural";
  const content = item.textoHtml
    ? `<div class="modal-rich-text">${item.textoHtml}</div>`
    : `<p>${item.texto || item.descricao || "Conteúdo em construção."}</p>`;
  const links = getItemLinks(item);

  modalBodyEl.innerHTML = `
    ${item.imagem ? `<img class="modal-image" src="${item.imagem}" alt="${title}">` : ""}
    <p class="modal-kicker">${selectedCountry.bandeira} ${selectedCountry.nome} · ${tabs.find((tab) => tab.key === tabKey)?.label}</p>
    <h2 id="modalTitle">${title}</h2>
    ${content}
    ${links.length ? `
      <div class="modal-links">
        ${links.map((link) => `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.titulo}</a>`).join("")}
      </div>
    ` : ""}
  `;

  modalEl.hidden = false;
  closeModalButton.focus();
}

function closeModal() {
  modalEl.hidden = true;
  modalBodyEl.innerHTML = "";
}

function getItemLinks(item) {
  const links = [];
  const seen = new Set();
  if (item.link) {
    links.push({ titulo: item.linkTitulo || "Fonte externa", url: item.link });
    seen.add(item.link);
  }
  if (Array.isArray(item.links)) {
    item.links.forEach((link) => {
      if (link.url && !seen.has(link.url)) {
        links.push({ titulo: link.titulo || "Link externo", url: link.url });
        seen.add(link.url);
      }
    });
  }
  return links;
}

function bindRichEditor(form) {
  const editor = form.querySelector("#richEditor");
  const toolbar = form.querySelector(".editor-toolbar");
  if (!editor || !toolbar) return;

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    editor.focus();

    if (button.dataset.command) {
      document.execCommand(button.dataset.command, false, null);
    }

    if (button.dataset.action === "link") {
      const url = prompt("Cole o endereço do link");
      if (url) document.execCommand("createLink", false, url);
    }

    if (button.dataset.action === "image") {
      const url = prompt("Cole a URL da imagem");
      if (url) document.execCommand("insertImage", false, url);
    }
  });

  editor.addEventListener("paste", (event) => {
    const imageFile = [...event.clipboardData.files].find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;

    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => document.execCommand("insertImage", false, reader.result);
    reader.readAsDataURL(imageFile);
  });

  editor.addEventListener("click", (event) => {
    if (event.target.tagName !== "IMG") return;
    const width = prompt("Largura da imagem em %, por exemplo 50 ou 100", "100");
    const parsedWidth = Number(width);
    if (parsedWidth) {
      event.target.style.width = `${Math.max(10, Math.min(100, parsedWidth))}%`;
      event.target.style.height = "auto";
    }
  });
}

function bindSearch() {
  searchInput.addEventListener("input", () => {
    const term = normalize(searchInput.value);
    if (!term) {
      searchResultsEl.innerHTML = "";
      return;
    }

    const results = [];
    countries.forEach((country) => {
      const searchableGroups = [
        { label: "País", items: [{ nome: country.nome, descricao: country.capital }] },
        { label: "Literatura", items: country.literatura },
        { label: "Música", items: country.musica },
        { label: "Mídia", items: country.midia || [] }
      ];

      searchableGroups.forEach((group) => {
        group.items.forEach((item) => {
          const title = typeof item === "string" ? item : item.nome || item.artista || "";
          const description = typeof item === "string" ? item : item.descricao || "";
          const text = typeof item === "string" ? item : item.texto || "";
          const haystack = normalize(`${country.nome} ${title} ${description} ${text}`);
          if (haystack.includes(term)) {
            results.push({ country, group: group.label, title });
          }
        });
      });
    });

    renderSearchResults(results.slice(0, 8));
  });
}

function renderSearchResults(results) {
  if (!results.length) {
    searchResultsEl.innerHTML = `<p class="intro-text">Nenhum resultado encontrado.</p>`;
    return;
  }

  searchResultsEl.innerHTML = results
    .map((result) => `
      <button class="result-button" type="button" data-id="${result.country.id}">
        ${result.country.bandeira} ${result.title}
        <small>${result.group} · ${result.country.nome}</small>
      </button>
    `)
    .join("");

  searchResultsEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectCountry(button.dataset.id);
      searchResultsEl.innerHTML = "";
      searchInput.value = "";
    });
  });
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

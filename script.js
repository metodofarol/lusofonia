const tabs = [
  { key: "informacoes", label: "Informações" },
  { key: "literatura", label: "Literatura" },
  { key: "musica", label: "Música" },
  { key: "cinema", label: "Cinema" },
  { key: "artes", label: "Artes" },
  { key: "jornais", label: "Jornais" },
  { key: "tv", label: "TV / YouTube" },
  { key: "curiosidadesLinguisticas", label: "Curiosidades Linguísticas" }
];

const editableTabs = ["literatura", "musica", "cinema", "artes", "jornais", "tv", "curiosidadesLinguisticas"];
const localStorageKey = "atlas-lusofonia-contribuicoes";

const countryShapes = {
  brasil: [[5.2, -73.9], [4.4, -51.1], [1.0, -43.0], [-8.7, -34.8], [-22.8, -39.0], [-33.7, -53.3], [-22.0, -57.8], [-17.0, -70.0]],
  portugal: [[42.2, -9.5], [41.6, -6.2], [37.0, -6.9], [36.9, -9.4]],
  angola: [[-5.0, 11.7], [-6.0, 24.0], [-17.2, 23.9], [-18.0, 12.1], [-8.7, 12.0]],
  mocambique: [[-10.5, 40.6], [-15.0, 39.2], [-18.8, 35.0], [-26.8, 32.8], [-24.4, 35.6], [-16.5, 39.0]],
  "cabo-verde": [[17.4, -25.4], [17.0, -22.5], [14.2, -22.5], [14.5, -25.5]],
  "guine-bissau": [[12.7, -16.8], [12.7, -13.6], [10.8, -13.7], [10.6, -16.6]],
  "sao-tome-principe": [[1.9, 6.1], [1.9, 7.7], [-0.2, 7.7], [-0.2, 6.1]],
  "timor-leste": [[-8.1, 124.0], [-8.1, 127.4], [-9.7, 127.4], [-9.7, 124.0]],
  "guine-equatorial": [[3.9, 8.4], [3.9, 9.2], [3.1, 9.2], [3.1, 8.4]]
};

let baseCountries = [];
let countries = [];
let learnerContent = {};
let selectedCountry = null;
let activeTab = "informacoes";
let map;
const markers = new Map();
const polygons = new Map();

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
  learnerContent = loadLearnerContent();
  countries = mergeLearnerContent(baseCountries, learnerContent);
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

function loadLearnerContent() {
  try {
    return JSON.parse(localStorage.getItem(localStorageKey)) || {};
  } catch (error) {
    return {};
  }
}

function saveLearnerContent() {
  localStorage.setItem(localStorageKey, JSON.stringify(learnerContent));
}

function mergeLearnerContent(sourceCountries, additions) {
  return sourceCountries.map((country) => {
    const nextCountry = structuredClone(country);
    editableTabs.forEach((tabKey) => {
      const localItems = additions[country.id]?.[tabKey] || [];
      nextCountry[tabKey] = [...(nextCountry[tabKey] || []), ...localItems];
    });
    return nextCountry;
  });
}

function refreshDataAfterEdit() {
  countries = mergeLearnerContent(baseCountries, learnerContent);
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
    const polygon = L.polygon(countryShapes[country.id], {
      color: "#0f766e",
      weight: 1.8,
      fillColor: "#0f766e",
      fillOpacity: 0.22
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

    polygons.set(country.id, polygon);
    markers.set(country.id, marker);
  });

  fitAllCountries();
}

function fitAllCountries() {
  const group = L.featureGroup([...polygons.values(), ...markers.values()]);
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
  polygons.forEach((polygon, id) => {
    const isActive = selectedCountry && selectedCountry.id === id;
    polygon.setStyle({
      fillOpacity: isActive ? 0.45 : 0.22,
      weight: isActive ? 3 : 1.8,
      color: isActive ? "#bf7d24" : "#0f766e",
      fillColor: isActive ? "#bf7d24" : "#0f766e"
    });
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

  const learnerForm = detailsEl.querySelector("#learnerForm");
  if (learnerForm) {
    learnerForm.addEventListener("submit", handleLearnerSubmit);
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

  if (tabKey === "curiosidadesLinguisticas") {
    return `
      <div class="content-list">
        ${country.curiosidadesLinguisticas.map((item, index) => contentCard(item, index)).join("")}
      </div>
      ${learnerPanel(tabKey)}
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
    <button class="content-card content-card-button" type="button" data-open-item="${index}">
      <div class="card-media">${image}</div>
      <div>
        <h3>${title}</h3>
        ${description}
        <span>Ver detalhes</span>
      </div>
    </button>
  `;
}

function learnerPanel(tabKey) {
  const isCuriosity = tabKey === "curiosidadesLinguisticas";
  const label = tabs.find((tab) => tab.key === tabKey)?.label || "aba";

  return `
    <section class="learner-panel">
      <h3>Área do aprendiz</h3>
      <p>Adicione conteúdo em ${label}. Ele aparece para o público neste navegador e pode ser exportado para atualizar o JSON do site.</p>

      <form id="learnerForm" class="learner-form">
        <input name="nome" type="text" placeholder="${isCuriosity ? "Título da curiosidade" : "Nome do escritor, artista, jornal ou canal"}" required>
        <textarea name="descricao" rows="2" placeholder="Descrição curta para o cartão" ${isCuriosity ? "" : "required"}></textarea>
        <textarea name="texto" rows="4" placeholder="Texto maior para a janela de detalhes"></textarea>
        <input name="imagem" type="url" placeholder="URL da foto ou imagem">
        <input name="link" type="url" placeholder="Link externo">
        <input name="linkTitulo" type="text" placeholder="Título do link">
        <button type="submit">Adicionar à aba</button>
      </form>

      <div class="learner-actions">
        <button id="exportJson" type="button">Exportar JSON atualizado</button>
        <button id="clearLocalData" type="button">Limpar inserções locais</button>
      </div>
    </section>
  `;
}

function handleLearnerSubmit(event) {
  event.preventDefault();
  if (!selectedCountry || !editableTabs.includes(activeTab)) return;

  const form = event.currentTarget;
  const formData = new FormData(form);
  const link = formData.get("link").trim();
  const linkTitle = formData.get("linkTitulo").trim();

  const newItem = {
    nome: formData.get("nome").trim(),
    descricao: formData.get("descricao").trim(),
    texto: formData.get("texto").trim(),
    imagem: formData.get("imagem").trim(),
    link
  };

  if (link) {
    newItem.links = [{ titulo: linkTitle || "Referência externa", url: link }];
  }

  Object.keys(newItem).forEach((key) => {
    if (!newItem[key] || (Array.isArray(newItem[key]) && !newItem[key].length)) {
      delete newItem[key];
    }
  });

  learnerContent[selectedCountry.id] ??= {};
  learnerContent[selectedCountry.id][activeTab] ??= [];
  learnerContent[selectedCountry.id][activeTab].push(newItem);
  saveLearnerContent();
  form.reset();
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
  learnerContent = {};
  localStorage.removeItem(localStorageKey);
  refreshDataAfterEdit();
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
  const text = item.texto || item.descricao || "Conteúdo em construção.";
  const links = getItemLinks(item);

  modalBodyEl.innerHTML = `
    ${item.imagem ? `<img class="modal-image" src="${item.imagem}" alt="${title}">` : ""}
    <p class="modal-kicker">${selectedCountry.bandeira} ${selectedCountry.nome} · ${tabs.find((tab) => tab.key === tabKey)?.label}</p>
    <h2 id="modalTitle">${title}</h2>
    <p>${text}</p>
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
  if (item.link) {
    links.push({ titulo: "Abrir referência", url: item.link });
  }
  if (Array.isArray(item.links)) {
    item.links.forEach((link) => {
      if (link.url) links.push({ titulo: link.titulo || "Abrir link", url: link.url });
    });
  }
  return links;
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
        { label: "Cinema", items: country.cinema },
        { label: "Artes", items: country.artes },
        { label: "Jornais", items: country.jornais },
        { label: "TV / YouTube", items: country.tv },
        { label: "Curiosidades", items: country.curiosidadesLinguisticas }
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

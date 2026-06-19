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

let countries = [];
let selectedCountry = null;
let activeTab = "informacoes";
let map;
const markers = new Map();
const polygons = new Map();

const detailsEl = document.querySelector("#details");
const countryListEl = document.querySelector("#countryList");
const searchInput = document.querySelector("#searchInput");
const searchResultsEl = document.querySelector("#searchResults");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  countries = await loadCountries();
  buildMap();
  renderCountryList();
  bindSearch();
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
      <div class="content-card">
        <ul class="curiosity-list">
          ${country.curiosidadesLinguisticas.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  const items = country[tabKey] || [];
  return `
    <div class="content-list">
      ${items.map((item) => contentCard(item)).join("")}
    </div>
  `;
}

function contentCard(item) {
  const title = item.nome || item.artista || item.titulo || "Item cultural";
  const description = item.descricao ? `<p>${item.descricao}</p>` : "";
  const link = item.link
    ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer">Abrir referência</a>`
    : "";

  return `
    <article class="content-card">
      <h3>${title}</h3>
      ${description}
      ${link}
    </article>
  `;
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
        { label: "Jornais", items: country.jornais }
      ];

      searchableGroups.forEach((group) => {
        group.items.forEach((item) => {
          const title = item.nome || item.artista || "";
          const haystack = normalize(`${country.nome} ${title} ${item.descricao || ""}`);
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

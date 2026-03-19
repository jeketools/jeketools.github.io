const state = {
  activeFilter: "All",
  query: "",
  tools: [],
};

const filterBar = document.querySelector("#filter-bar");
const toolsGrid = document.querySelector("#tools-grid");
const toolCount = document.querySelector("#tool-count");
const creatorCount = document.querySelector("#creator-count");
const resultCopy = document.querySelector("#result-copy");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const template = document.querySelector("#tool-card-template");
const installModal = document.querySelector("#install-modal");
const installButton = document.querySelector("#install-app");
const installLaterButton = document.querySelector("#install-later");
const installTitle = document.querySelector("#install-title");
const installCopy = document.querySelector("#install-copy");
const installHelp = document.querySelector("#install-help");

let installPromptEvent = null;
let hasShownInstallModal = false;

function isAppleMobileDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isTouchCapableAppleDesktopUserAgent =
    userAgent.includes("macintosh") &&
    "ontouchend" in document &&
    navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || isTouchCapableAppleDesktopUserAgent;
}

function updateInstallPromptContent() {
  if (!installTitle || !installCopy || !installButton || !installHelp) {
    return;
  }

  if (isAppleMobileDevice()) {
    installTitle.textContent = "Pasang Jeketools di iPhone.";
    installCopy.textContent = "Buka menu Share di Safari, lalu pilih Add to Home Screen.";
    installButton.textContent = "How to Install";
    installHelp.hidden = true;
    return;
  }

  installTitle.textContent = "Pasang Jeketools ke home screen.";
  installCopy.textContent = "Buka Jeketools lebih cepat.";
  installButton.textContent = "Install";
  installHelp.hidden = true;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

function hideInstallModal() {
  if (!installModal) {
    return;
  }

  installModal.hidden = true;
  if (installHelp) {
    installHelp.hidden = true;
  }
  sessionStorage.setItem("jeketools-install-dismissed", "true");
}

function showInstallModal() {
  if (
    !installModal ||
    hasShownInstallModal ||
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  ) {
    return;
  }

  hasShownInstallModal = true;
  installModal.hidden = false;
}

function setupInstallPrompt() {
  if (!installModal || !installButton || !installLaterButton) {
    return;
  }

  updateInstallPromptContent();

  if (sessionStorage.getItem("jeketools-install-dismissed") !== "true") {
    window.setTimeout(() => {
      showInstallModal();
    }, 1800);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    showInstallModal();
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    hideInstallModal();
  });

  installLaterButton.addEventListener("click", () => {
    hideInstallModal();
  });

  installButton.addEventListener("click", async () => {
    if (!installPromptEvent) {
      if (isAppleMobileDevice()) {
        installHelp.hidden = !installHelp.hidden;
      }
      return;
    }

    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    installPromptEvent = null;
    hideInstallModal();
  });
}

function getFilters() {
  return ["All", ...new Set(state.tools.flatMap((tool) => tool.tags))];
}

function getVisibleTools() {
  const query = state.query.trim().toLowerCase();

  return state.tools
    .filter((tool) => {
      const matchFilter = state.activeFilter === "All" || tool.tags.includes(state.activeFilter);
      const haystack = [
        tool.name,
        tool.type,
        tool.description,
        tool.creator,
        ...tool.tags,
      ].join(" ").toLowerCase();
      const matchQuery = !query || haystack.includes(query);

      return matchFilter && matchQuery;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function renderFilters() {
  filterBar.replaceChildren();

  getFilters().forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${filter === state.activeFilter ? " is-active" : ""}`;
    button.textContent = filter;
    button.addEventListener("click", () => {
      state.activeFilter = filter;
      renderFilters();
      renderTools();
    });
    filterBar.append(button);
  });
}

function createTag(tag) {
  const pill = document.createElement("span");
  pill.className = "tool-tag";
  pill.textContent = tag;
  return pill;
}

function renderTools() {
  const visibleTools = getVisibleTools();
  toolsGrid.replaceChildren();

  visibleTools.forEach((tool, index) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".tool-card");
    const type = fragment.querySelector(".tool-type");
    const name = fragment.querySelector(".tool-name");
    const description = fragment.querySelector(".tool-desc");
    const tags = fragment.querySelector(".tool-tags");
    const creator = fragment.querySelector(".tool-creator");
    const link = fragment.querySelector(".tool-link");
    const source = fragment.querySelector(".tool-source");
    const actions = fragment.querySelector(".tool-actions");

    card.style.animationDelay = `${index * 80}ms`;
    type.textContent = tool.type;
    name.textContent = tool.name;
    description.textContent = tool.description;
    creator.textContent = tool.creator;
    link.href = tool.url;
    link.target = "_blank";
    link.rel = "noreferrer";

    if (tool.sourceUrl) {
      source.href = tool.sourceUrl;
    } else {
      source.remove();
      actions.style.gridTemplateColumns = "1fr";
    }

    tool.tags.forEach((tag) => {
      tags.append(createTag(tag));
    });

    toolsGrid.append(fragment);
  });
}

async function loadTools() {
  try {
    const response = await fetch("./tools.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    state.tools = await response.json();
    toolCount.textContent = String(state.tools.length);
    creatorCount.textContent = String(new Set(state.tools.map((tool) => tool.creator)).size);
    renderFilters();
    renderTools();
  } catch (error) {
    if (resultCopy) {
      resultCopy.textContent = "Gagal memuat daftar tools.";
    }
    emptyState.hidden = false;
    toolsGrid.replaceChildren();
    console.error(error);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTools();
});

registerServiceWorker();
setupInstallPrompt();
loadTools();

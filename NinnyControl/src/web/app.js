async function loadOverview() {
  const botTagEl = document.getElementById("botTag");
  const guildCountEl = document.getElementById("guildCount");
  const commandsRunEl = document.getElementById("commandsRun");
  const warningsGivenEl = document.getElementById("warningsGiven");
  const mutesIssuedEl = document.getElementById("mutesIssued");
  const spamEventsEl = document.getElementById("spamEvents");
  const messagesSeenEl = document.getElementById("messagesSeen");
  const ticketsOpenedEl = document.getElementById("ticketsOpened");
  const guildTableBody = document.getElementById("guildTableBody");

  try {
    const res = await fetch("/api/overview");
    const data = await res.json();

    const botTag = data.bot && data.bot.tag ? data.bot.tag : "Unknown";
    const guilds = data.guilds || [];
    const stats = data.stats || {};

    botTagEl.textContent = botTag;
    guildCountEl.textContent = guilds.length;
    commandsRunEl.textContent = stats.commandsRun || 0;
    warningsGivenEl.textContent = stats.warningsGiven || 0;
    mutesIssuedEl.textContent = stats.mutesIssued || 0;
    spamEventsEl.textContent = stats.spamEvents || 0;
    messagesSeenEl.textContent = stats.messagesSeen || 0;
    ticketsOpenedEl.textContent = stats.ticketsOpened || 0;

    if (guilds.length === 0) {
      guildTableBody.innerHTML = `<tr><td colspan="3">No guilds (is the bot invited anywhere?).</td></tr>`;
    } else {
      guildTableBody.innerHTML = guilds
        .map(
          g => `
        <tr>
          <td>${g.name}</td>
          <td><code>${g.id}</code></td>
          <td>${g.memberCount}</td>
        </tr>`
        )
        .join("");
    }
  } catch (err) {
    console.error("Failed to load overview:", err);
    guildTableBody.innerHTML = `<tr><td colspan="3">Failed to load data.</td></tr>`;
  }
}

let meData = null;
let currentGuildId = null;

async function loadMe() {
  const authStatus = document.getElementById("authStatus");
  const manageSection = document.getElementById("manageGuildSection");
  const guildSelect = document.getElementById("manageGuildSelect");
  const noGuildsMessage = document.getElementById("noGuildsMessage");
  const guildConfigContainer = document.getElementById("guildConfigContainer");

  try {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      meData = null;
      authStatus.innerHTML = `
        <button onclick="window.location.href='/auth/discord'">Login with Discord</button>
      `;
      manageSection.style.display = "none";
      return;
    }

    const data = await res.json();
    meData = data;

    const user = data.user;
    const guilds = data.guilds || [];

    authStatus.innerHTML = `
      <span>Logged in as <strong>${user.username}#${user.discriminator}</strong></span>
      <button onclick="window.location.href='/auth/logout'" style="margin-left:8px;">Logout</button>
    `;

    manageSection.style.display = "block";

    if (guilds.length === 0) {
      noGuildsMessage.textContent = "No manageable guilds where both you and the bot are present.";
      guildConfigContainer.style.display = "none";
      return;
    }

    noGuildsMessage.textContent = "";
    guildConfigContainer.style.display = "block";

    guildSelect.innerHTML = guilds
      .map(g => `<option value="${g.id}">${g.name}</option>`)
      .join("");

    currentGuildId = guilds[0].id;
    guildSelect.value = currentGuildId;

    guildSelect.onchange = () => {
      currentGuildId = guildSelect.value;
      loadGuildConfig();
    };

    await loadGuildConfig();
  } catch (err) {
    console.error("Failed to load /api/me:", err);
    authStatus.innerHTML = `
      <button onclick="window.location.href='/auth/discord'">Login with Discord</button>
    `;
    manageSection.style.display = "none";
  }
}

async function loadGuildConfig() {
  if (!currentGuildId) return;

  const cfgAntiSpam = document.getElementById("cfgAntiSpam");
  const cfgLinkFilter = document.getElementById("cfgLinkFilter");
  const cfgInviteFilter = document.getElementById("cfgInviteFilter");
  const cfgWelcomeMessage = document.getElementById("cfgWelcomeMessage");
  const cfgGoodbyeMessage = document.getElementById("cfgGoodbyeMessage");
  const cfgBlacklistWords = document.getElementById("cfgBlacklistWords");
  const saveStatus = document.getElementById("saveStatus");

  saveStatus.textContent = "Loading config...";

  try {
    const res = await fetch(`/api/guilds/${encodeURIComponent(currentGuildId)}/config`);
    if (!res.ok) {
      saveStatus.textContent = "Failed to load config.";
      return;
    }

    const cfg = await res.json();

    cfgAntiSpam.checked = !!cfg.antiSpamEnabled;
    cfgLinkFilter.checked = !!cfg.linkFilterEnabled;
    cfgInviteFilter.checked = !!cfg.inviteFilterEnabled;
    cfgWelcomeMessage.value = cfg.welcomeMessage || "";
    cfgGoodbyeMessage.value = cfg.goodbyeMessage || "";
    cfgBlacklistWords.value = Array.isArray(cfg.blacklistWords) ? cfg.blacklistWords.join(", ") : "";

    saveStatus.textContent = "";
  } catch (err) {
    console.error("Failed to load guild config:", err);
    saveStatus.textContent = "Failed to load config.";
  }
}

async function saveGuildConfig() {
  if (!currentGuildId) return;

  const cfgAntiSpam = document.getElementById("cfgAntiSpam");
  const cfgLinkFilter = document.getElementById("cfgLinkFilter");
  const cfgInviteFilter = document.getElementById("cfgInviteFilter");
  const cfgWelcomeMessage = document.getElementById("cfgWelcomeMessage");
  const cfgGoodbyeMessage = document.getElementById("cfgGoodbyeMessage");
  const cfgBlacklistWords = document.getElementById("cfgBlacklistWords");
  const saveStatus = document.getElementById("saveStatus");

  const payload = {
    antiSpamEnabled: cfgAntiSpam.checked,
    linkFilterEnabled: cfgLinkFilter.checked,
    inviteFilterEnabled: cfgInviteFilter.checked,
    welcomeMessage: cfgWelcomeMessage.value,
    goodbyeMessage: cfgGoodbyeMessage.value,
    blacklistWords: cfgBlacklistWords.value
      .split(",")
      .map(x => x.trim())
      .filter(x => x.length > 0)
  };

  saveStatus.textContent = "Saving...";

  try {
    const res = await fetch(`/api/guilds/${encodeURIComponent(currentGuildId)}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      saveStatus.textContent = "Failed to save config.";
      return;
    }

    saveStatus.textContent = "Saved ✔";
    setTimeout(() => (saveStatus.textContent = ""), 2000);
  } catch (err) {
    console.error("Failed to save config:", err);
    saveStatus.textContent = "Failed to save config.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadMe();
  setInterval(loadOverview, 15000);

  const saveBtn = document.getElementById("saveConfigBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveGuildConfig();
    });
  }
});

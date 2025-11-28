// src/index.js
require("dotenv").config();

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events
} = require("discord.js");
const express = require("express");
const morgan = require("morgan");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { readJson, writeJson } = require("./db");

// node-fetch v3 as ESM wrapper
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const token = process.env.DISCORD_TOKEN;
const port = process.env.PORT || 3000;
const dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || `http://localhost:${port}`;
const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
const sessionSecret = process.env.SESSION_SECRET || "change-me";

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}
if (!clientId || !clientSecret) {
  console.warn("⚠️ DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET missing. OAuth will not work until you set them.");
}

// --- DISCORD CLIENT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction]
});

client.commands = new Collection();

// In-memory mirrors of JSON DB
client.config = readJson("config", {});
client.warnings = readJson("warnings", {});
client.levels = readJson("levels", {});
client.reactionRoles = readJson("reactionroles", {});

client.spamTracker = new Map();
client.stats = {
  commandsRun: 0,
  warningsGiven: 0,
  mutesIssued: 0,
  spamEvents: 0,
  ticketsOpened: 0,
  messagesSeen: 0
};

function saveConfig() {
  writeJson("config", client.config);
}
function saveWarnings() {
  writeJson("warnings", client.warnings);
}
function saveLevels() {
  writeJson("levels", client.levels);
}
function saveReactionRoles() {
  writeJson("reactionroles", client.reactionRoles);
}

// Load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`Command at ${filePath} is missing "data" or "execute".`);
  }
}

// Logging helper
client.sendLog = async (guild, embedData) => {
  if (!guild) return;
  const guildId = guild.id;

  const cfg = client.config[guildId] || {};
  if (!cfg.logChannelId) return;

  let channel = guild.channels.cache.get(cfg.logChannelId);
  if (!channel) {
    try {
      channel = await guild.channels.fetch(cfg.logChannelId);
    } catch {
      return;
    }
  }
  if (!channel || !channel.isTextBased()) return;

  const embed = {
    color: embedData.color || 0x6a00ff,
    title: embedData.title || "Log",
    description: embedData.description || "",
    fields: embedData.fields || [],
    timestamp: new Date().toISOString()
  };

  try {
    await channel.send({ embeds: [embed] });
  } catch {}
};

// Leveling
const XP_PER_MESSAGE = 10;
const XP_COOLDOWN_MS = 45 * 1000;
const lastXP = {};

function addXP(message) {
  const guildId = message.guild.id;
  const userId = message.author.id;
  const now = Date.now();

  if (!lastXP[guildId]) lastXP[guildId] = {};
  if (lastXP[guildId][userId] && now - lastXP[guildId][userId] < XP_COOLDOWN_MS) return;
  lastXP[guildId][userId] = now;

  if (!client.levels[guildId]) client.levels[guildId] = {};
  if (!client.levels[guildId][userId]) client.levels[guildId][userId] = { xp: 0, level: 0 };

  const userData = client.levels[guildId][userId];
  userData.xp += XP_PER_MESSAGE;

  const newLevel = Math.floor(0.1 * Math.sqrt(userData.xp));
  if (newLevel > userData.level) {
    userData.level = newLevel;
    message.channel.send(`🎉 <@${userId}> leveled up to **level ${newLevel}**!`).catch(() => {});
  }

  saveLevels();
}

// Auto-mod
const SPAM_WINDOW_MS = 7000;
const SPAM_MAX_MSG = 7;
const SPAM_TIMEOUT_MS = 10 * 60 * 1000;
const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
const urlRegex = /https?:\/\/\S+/i;

function getGuildConfig(guildId) {
  if (!client.config[guildId]) {
    client.config[guildId] = {
      logChannelId: null,
      welcomeChannelId: null,
      welcomeMessage: "Welcome {user} to {server}!",
      goodbyeChannelId: null,
      goodbyeMessage: "{user} left the server.",
      autoRoleId: null,
      verifyRoleId: null,
      antiSpamEnabled: true,
      linkFilterEnabled: false,
      inviteFilterEnabled: true,
      blacklistWords: []
    };
    saveConfig();
  }
  return client.config[guildId];
}

// Events
const { SlashCommandBuilder } = require("discord.js");

client.once(Events.ClientReady, () => {
  console.log(`[NinnyControl] Logged in as ${client.user.tag}`);
});

client.on(Events.GuildCreate, guild => {
  console.log(`[NinnyControl] Joined guild: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildDelete, guild => {
  console.log(`[NinnyControl] Removed from guild: ${guild.name} (${guild.id})`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === "ninny_verify") {
      const cfg = getGuildConfig(interaction.guild.id);
      if (!cfg.verifyRoleId) {
        return interaction.reply({ content: "Verify role not configured.", ephemeral: true });
      }
      const role = interaction.guild.roles.cache.get(cfg.verifyRoleId);
      if (!role) {
        return interaction.reply({ content: "Verify role not found.", ephemeral: true });
      }
      try {
        await interaction.member.roles.add(role);
        await interaction.reply({ content: "✅ You are now verified.", ephemeral: true });
      } catch {
        await interaction.reply({ content: "Failed to assign role. Check my permissions.", ephemeral: true });
      }
      return;
    }

    if (customId === "ninny_ticket_close") {
      if (!interaction.channel) return;
      await interaction.reply({ content: "Closing ticket...", ephemeral: true }).catch(() => {});
      const guild = interaction.guild;
      const channelName = interaction.channel.name || "";
      client.sendLog(guild, {
        title: "Ticket Closed",
        description: `🎫 Ticket channel **${channelName}** closed by <@${interaction.user.id}>.`,
        fields: [
          { name: "Channel ID", value: interaction.channel.id, inline: false }
        ]
      });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
      return;
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    client.stats.commandsRun += 1;
    await command.execute(interaction, client, { getGuildConfig, saveConfig, saveWarnings });
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command.",
        ephemeral: true
      });
    }
  }
});

client.on(Events.GuildMemberAdd, async member => {
  const cfg = getGuildConfig(member.guild.id);

  if (cfg.autoRoleId) {
    const role = member.guild.roles.cache.get(cfg.autoRoleId);
    if (role) member.roles.add(role).catch(() => {});
  }

  if (cfg.welcomeChannelId) {
    const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
    if (channel && channel.isTextBased()) {
      const msg = cfg.welcomeMessage
        .replace("{user}", `<@${member.id}>`)
        .replace("{server}", member.guild.name);
      channel.send(msg).catch(() => {});
    }
  }

  client.sendLog(member.guild, {
    title: "Member Joined",
    description: `👤 <@${member.id}> joined the server.`,
    fields: [
      { name: "User", value: `${member.user.tag} (${member.id})`, inline: false },
      { name: "Account Created", value: member.user.createdAt.toISOString(), inline: false }
    ]
  });
});

client.on(Events.GuildMemberRemove, member => {
  const user = member.user || member;
  const cfg = getGuildConfig(member.guild.id);

  if (cfg.goodbyeChannelId) {
    const channel = member.guild.channels.cache.get(cfg.goodbyeChannelId);
    if (channel && channel.isTextBased()) {
      const msg = cfg.goodbyeMessage
        .replace("{user}", `${user.tag}`)
        .replace("{server}", member.guild.name);
      channel.send(msg).catch(() => {});
    }
  }

  client.sendLog(member.guild, {
    title: "Member Left",
    description: `👋 ${user.tag} (${user.id}) left the server.`
  });
});

client.on(Events.MessageCreate, async message => {
  if (!message.guild || message.author.bot) return;

  client.stats.messagesSeen += 1;
  const guildId = message.guild.id;
  const userId = message.author.id;
  const cfg = getGuildConfig(guildId);

  addXP(message);

  if (cfg.inviteFilterEnabled && inviteRegex.test(message.content)) {
    await message.delete().catch(() => {});
    message.channel.send(`🚫 ${message.author}, Discord invites are not allowed here.`)
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
      .catch(() => {});
    client.sendLog(message.guild, {
      title: "Invite Blocked",
      description: `Deleted invite link from <@${userId}>.`,
      fields: [
        { name: "Content", value: message.content.slice(0, 500), inline: false }
      ]
    });
    return;
  }

  if (cfg.linkFilterEnabled && urlRegex.test(message.content)) {
    await message.delete().catch(() => {});
    message.channel.send(`🔗 ${message.author}, links are disabled in this server.`)
      .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
      .catch(() => {});
    client.sendLog(message.guild, {
      title: "Link Blocked",
      description: `Deleted link message from <@${userId}>.`,
      fields: [
        { name: "Content", value: message.content.slice(0, 500), inline: false }
      ]
    });
    return;
  }

  if (cfg.blacklistWords && cfg.blacklistWords.length > 0) {
    const lowered = message.content.toLowerCase();
    const hit = cfg.blacklistWords.find(w => w && lowered.includes(w.toLowerCase()));
    if (hit) {
      await message.delete().catch(() => {});
      message.channel.send(`🛑 ${message.author}, that word is not allowed here.`)
        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000))
        .catch(() => {});
      client.sendLog(message.guild, {
        title: "Blacklisted Word",
        description: `Message from <@${userId}> contained blacklisted word.`,
        fields: [
          { name: "Word", value: hit, inline: false },
          { name: "Content", value: message.content.slice(0, 500), inline: false }
        ]
      });
      return;
    }
  }

  if (cfg.antiSpamEnabled) {
    if (!client.spamTracker.has(guildId)) client.spamTracker.set(guildId, {});
    const guildBucket = client.spamTracker.get(guildId);
    if (!guildBucket[userId]) {
      guildBucket[userId] = { count: 0, firstTs: Date.now(), flagged: false };
    }

    const now = Date.now();
    const bucket = guildBucket[userId];

    if (now - bucket.firstTs > SPAM_WINDOW_MS) {
      bucket.count = 0;
      bucket.firstTs = now;
      bucket.flagged = false;
    }

    bucket.count += 1;

    if (bucket.count > SPAM_MAX_MSG && !bucket.flagged) {
      bucket.flagged = true;
      client.stats.spamEvents += 1;

      const member = message.member;
      let action = "detected";

      if (member && member.moderatable) {
        try {
          await member.timeout(SPAM_TIMEOUT_MS, "Auto spam protection (NinnyControl)");
          action = `timed out for ${Math.round(SPAM_TIMEOUT_MS / 60000)} minutes`;
        } catch {
          action = "detected (failed to timeout; missing permissions?)";
        }
      }

      try {
        await message.reply(
          `🚨 **Spam detected.** ${message.author}, slow down.\n(You have been ${action}.)`
        );
      } catch {}

      client.sendLog(message.guild, {
        title: "Spam Detected",
        description: `User <@${userId}> triggered spam protection (${bucket.count} msgs / ${SPAM_WINDOW_MS /
          1000}s).`,
        fields: [
          { name: "User", value: `${message.author.tag} (${userId})`, inline: false },
          { name: "Action", value: action, inline: false }
        ]
      });
    }
  }
});

client.on(Events.MessageDelete, message => {
  if (!message.guild || message.author?.bot) return;

  const content = message.partial ? "[Unknown content – partial message]" : (message.content || "[No content]");
  client.sendLog(message.guild, {
    title: "Message Deleted",
    fields: [
      { name: "Author", value: `${message.author?.tag || "Unknown"} (${message.author?.id || "N/A"})`, inline: false },
      { name: "Channel", value: `<#${message.channel.id}>`, inline: false },
      { name: "Content", value: content.slice(0, 1000), inline: false }
    ]
  });
});

client.on(Events.MessageUpdate, (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.author?.bot) return;

  const before = oldMsg.partial ? "[Unknown content – partial message]" : (oldMsg.content || "[No content]");
  const after = newMsg.content || "[No content]";
  if (before === after) return;

  client.sendLog(newMsg.guild, {
    title: "Message Edited",
    fields: [
      { name: "Author", value: `${newMsg.author.tag} (${newMsg.author.id})`, inline: false },
      { name: "Channel", value: `<#${newMsg.channel.id}>`, inline: false },
      { name: "Before", value: before.slice(0, 500), inline: false },
      { name: "After", value: after.slice(0, 500), inline: false }
    ]
  });
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;

  const guildId = reaction.message.guild.id;
  const configs = client.reactionRoles[guildId];
  if (!configs || configs.length === 0) return;

  const emojiKey = reaction.emoji.id || reaction.emoji.name;
  const match = configs.find(
    r => r.messageId === reaction.message.id && r.emoji === emojiKey
  );
  if (!match) return;

  const role = reaction.message.guild.roles.cache.get(match.roleId);
  if (!role) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  member.roles.add(role).catch(() => {});
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot || !reaction.message.guild) return;

  const guildId = reaction.message.guild.id;
  const configs = client.reactionRoles[guildId];
  if (!configs || configs.length === 0) return;

  const emojiKey = reaction.emoji.id || reaction.emoji.name;
  const match = configs.find(
    r => r.messageId === reaction.message.id && r.emoji === emojiKey
  );
  if (!match) return;

  const role = reaction.message.guild.roles.cache.get(match.roleId);
  if (!role) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  member.roles.remove(role).catch(() => {});
});

// Web dashboard + OAuth2
function startDashboard() {
  const app = express();
  const staticDir = path.join(__dirname, "web");

  app.use(morgan("dev"));
  app.use(express.json());
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false
    }
  }));

  app.use(express.static(staticDir));

  function requireAuth(req, res, next) {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  }

  const discordAuthBase = "https://discord.com/api/oauth2";
  const discordApiBase = "https://discord.com/api";

  app.get("/auth/discord", (req, res) => {
    if (!clientId || !clientSecret) {
      return res.status(500).send("OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.");
    }

    const state = Math.random().toString(36).slice(2);
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${dashboardBaseUrl}/auth/discord/callback`,
      response_type: "code",
      scope: "identify guilds",
      state
    });

    res.redirect(`${discordAuthBase}/authorize?${params.toString()}`);
  });

  app.get("/auth/discord/callback", async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state || state !== req.session.oauthState) {
      return res.status(400).send("Invalid OAuth state.");
    }

    try {
      const tokenRes = await fetch(`${discordApiBase}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code.toString(),
          redirect_uri: `${dashboardBaseUrl}/auth/discord/callback`
        })
      });

      if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        console.error("Token exchange failed:", txt);
        return res.status(500).send("Token exchange failed.");
      }

      const tokenJson = await tokenRes.json();
      const accessToken = tokenJson.access_token;
      const tokenType = tokenJson.token_type;

      const userRes = await fetch(`${discordApiBase}/users/@me`, {
        headers: { Authorization: `${tokenType} ${accessToken}` }
      });
      const user = await userRes.json();

      const guildsRes = await fetch(`${discordApiBase}/users/@me/guilds`, {
        headers: { Authorization: `${tokenType} ${accessToken}` }
      });
      const guilds = await guildsRes.json();

      req.session.user = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar
      };
      req.session.guilds = guilds;
      req.session.save(() => {
        res.redirect("/");
      });
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.status(500).send("OAuth error.");
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/overview", (req, res) => {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      memberCount: g.memberCount
    }));

    res.json({
      bot: {
        tag: client.user ? client.user.tag : null,
        id: client.user ? client.user.id : null
      },
      stats: client.stats,
      guilds
    });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    const user = req.session.user;
    const guilds = Array.isArray(req.session.guilds) ? req.session.guilds : [];

    const botGuildIds = new Set(client.guilds.cache.map(g => g.id));

    const manageable = guilds
      .filter(g => botGuildIds.has(g.id))
      .filter(g => {
        if (!g.permissions) return false;
        try {
          const perms = BigInt(g.permissions);
          const MANAGE_GUILD = 0x20n;
          const ADMIN = 0x8n;
          return (perms & MANAGE_GUILD) === MANAGE_GUILD || (perms & ADMIN) === ADMIN;
        } catch {
          return false;
        }
      });

    res.json({
      user,
      guilds: manageable
    });
  });

  app.get("/api/guilds/:id/config", requireAuth, (req, res) => {
    const guildId = req.params.id;
    const userGuilds = Array.isArray(req.session.guilds) ? req.session.guilds : [];

    const hasAccess = userGuilds.some(g => g.id === guildId);
    if (!hasAccess) return res.status(403).json({ error: "No access to this guild." });

    const cfg = getGuildConfig(guildId);
    res.json(cfg);
  });

  app.post("/api/guilds/:id/config", requireAuth, (req, res) => {
    const guildId = req.params.id;
    const userGuilds = Array.isArray(req.session.guilds) ? req.session.guilds : [];

    const hasAccess = userGuilds.some(g => g.id === guildId);
    if (!hasAccess) return res.status(403).json({ error: "No access to this guild." });

    const cfg = getGuildConfig(guildId);
    const body = req.body || {};

    const allowedKeys = [
      "welcomeMessage",
      "goodbyeMessage",
      "antiSpamEnabled",
      "linkFilterEnabled",
      "inviteFilterEnabled",
      "blacklistWords"
    ];

    for (const key of allowedKeys) {
      if (typeof body[key] !== "undefined") {
        if (key === "blacklistWords" && Array.isArray(body[key])) {
          cfg.blacklistWords = body[key].map(x => String(x).trim()).filter(x => x.length > 0);
        } else {
          cfg[key] = body[key];
        }
      }
    }

    client.config[guildId] = cfg;
    saveConfig();

    res.json({ ok: true, config: cfg });
  });

  app.listen(port, () => {
    console.log(`[NinnyControl] Dashboard running at ${dashboardBaseUrl}`);
  });
}

(async () => {
  try {
    await client.login(token);
    startDashboard();
  } catch (err) {
    console.error("Fatal error starting NinnyControl:", err);
    process.exit(1);
  }
})();

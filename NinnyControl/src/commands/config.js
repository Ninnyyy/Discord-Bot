const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("View or set NinnyControl settings for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt.setName("log_channel")
        .setDescription("Log channel")
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName("welcome_channel")
        .setDescription("Welcome channel")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("welcome_message")
        .setDescription("Welcome message template (use {user}, {server})")
        .setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName("goodbye_channel")
        .setDescription("Goodbye channel")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("goodbye_message")
        .setDescription("Goodbye message template (use {user}, {server})")
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName("auto_role")
        .setDescription("Role to auto-assign on join")
        .setRequired(false)
    )
    .addRoleOption(opt =>
      opt.setName("verify_role")
        .setDescription("Role to give on verify button")
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName("anti_spam")
        .setDescription("Enable anti-spam (true/false)")
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName("link_filter")
        .setDescription("Enable global link filter (true/false)")
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName("invite_filter")
        .setDescription("Enable Discord invite filter (true/false)")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("blacklist_words")
        .setDescription("Comma-separated list of blacklisted words")
        .setRequired(false)
    ),
  async execute(interaction, client, { getGuildConfig, saveConfig }) {
    if (!interaction.guild) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const cfg = getGuildConfig(guildId);

    const logChannel = interaction.options.getChannel("log_channel");
    const welcomeChannel = interaction.options.getChannel("welcome_channel");
    const welcomeMessage = interaction.options.getString("welcome_message");
    const goodbyeChannel = interaction.options.getChannel("goodbye_channel");
    const goodbyeMessage = interaction.options.getString("goodbye_message");
    const autoRole = interaction.options.getRole("auto_role");
    const verifyRole = interaction.options.getRole("verify_role");
    const antiSpam = interaction.options.getBoolean("anti_spam");
    const linkFilter = interaction.options.getBoolean("link_filter");
    const inviteFilter = interaction.options.getBoolean("invite_filter");
    const blacklistWords = interaction.options.getString("blacklist_words");

    let changed = false;

    if (logChannel) { cfg.logChannelId = logChannel.id; changed = true; }
    if (welcomeChannel) { cfg.welcomeChannelId = welcomeChannel.id; changed = true; }
    if (typeof welcomeMessage === "string") { cfg.welcomeMessage = welcomeMessage; changed = true; }
    if (goodbyeChannel) { cfg.goodbyeChannelId = goodbyeChannel.id; changed = true; }
    if (typeof goodbyeMessage === "string") { cfg.goodbyeMessage = goodbyeMessage; changed = true; }
    if (autoRole) { cfg.autoRoleId = autoRole.id; changed = true; }
    if (verifyRole) { cfg.verifyRoleId = verifyRole.id; changed = true; }
    if (typeof antiSpam === "boolean") { cfg.antiSpamEnabled = antiSpam; changed = true; }
    if (typeof linkFilter === "boolean") { cfg.linkFilterEnabled = linkFilter; changed = true; }
    if (typeof inviteFilter === "boolean") { cfg.inviteFilterEnabled = inviteFilter; changed = true; }

    if (typeof blacklistWords === "string") {
      cfg.blacklistWords = blacklistWords
        .split(",")
        .map(x => x.trim())
        .filter(x => x.length > 0);
      changed = true;
    }

    if (changed) saveConfig();

    await interaction.reply({
      embeds: [
        {
          title: "NinnyControl Config",
          color: 0x6a00ff,
          fields: [
            { name: "Log Channel", value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : "Not set", inline: true },
            { name: "Welcome Channel", value: cfg.welcomeChannelId ? `<#${cfg.welcomeChannelId}>` : "Not set", inline: true },
            { name: "Goodbye Channel", value: cfg.goodbyeChannelId ? `<#${cfg.goodbyeChannelId}>` : "Not set", inline: true },
            { name: "Auto Role", value: cfg.autoRoleId ? `<@&${cfg.autoRoleId}>` : "Not set", inline: true },
            { name: "Verify Role", value: cfg.verifyRoleId ? `<@&${cfg.verifyRoleId}>` : "Not set", inline: true },
            { name: "Anti-Spam", value: cfg.antiSpamEnabled ? "Enabled" : "Disabled", inline: true },
            { name: "Link Filter", value: cfg.linkFilterEnabled ? "Enabled" : "Disabled", inline: true },
            { name: "Invite Filter", value: cfg.inviteFilterEnabled ? "Enabled" : "Disabled", inline: true },
            {
              name: "Blacklist Words",
              value: cfg.blacklistWords && cfg.blacklistWords.length > 0
                ? cfg.blacklistWords.join(", ")
                : "None",
              inline: false
            }
          ]
        }
      ],
      ephemeral: true
    });
  }
};

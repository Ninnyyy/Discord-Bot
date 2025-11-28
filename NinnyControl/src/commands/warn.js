const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user and track the warning count.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to warn")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(false)
    ),
  async execute(interaction, client, { saveWarnings }) {
    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: "You cannot warn yourself.", ephemeral: true });
    }

    if (!interaction.guild) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const userId = target.id;

    if (!client.warnings[guildId]) client.warnings[guildId] = {};
    if (!client.warnings[guildId][userId]) client.warnings[guildId][userId] = 0;
    client.warnings[guildId][userId] += 1;
    const total = client.warnings[guildId][userId];

    saveWarnings();

    await interaction.reply({
      embeds: [
        {
          title: "User Warned",
          color: 0xffa500,
          description: `⚠️ <@${userId}> has been warned.`,
          fields: [
            { name: "Reason", value: reason, inline: false },
            { name: "Total Warnings", value: total.toString(), inline: true },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          ]
        }
      ]
    });

    client.stats.warningsGiven = (client.stats.warningsGiven || 0) + 1;

    try {
      await target.send(`You were warned in **${interaction.guild.name}**.
Reason: ${reason}
Total warnings: ${total}`);
    } catch {}
  }
};

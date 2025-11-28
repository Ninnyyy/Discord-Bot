const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your level and XP, or another user's.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),
  async execute(interaction, client) {
    const target = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;

    const guildLevels = client.levels[guildId] || {};
    const data = guildLevels[target.id] || { xp: 0, level: 0 };

    await interaction.reply({
      embeds: [
        {
          title: `Level for ${target.tag}`,
          color: 0x6a00ff,
          fields: [
            { name: "Level", value: data.level.toString(), inline: true },
            { name: "XP", value: data.xp.toString(), inline: true }
          ]
        }
      ]
    });
  }
};

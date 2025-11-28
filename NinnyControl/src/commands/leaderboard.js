const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top 10 users by level."),
  async execute(interaction, client) {
    const guildId = interaction.guild.id;
    const guildLevels = client.levels[guildId] || {};

    const entries = Object.entries(guildLevels)
      .map(([userId, data]) => ({ userId, xp: data.xp || 0, level: data.level || 0 }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (entries.length === 0) {
      return interaction.reply("No leveling data yet.");
    }

    const lines = await Promise.all(
      entries.map(async (entry, idx) => {
        let tag = entry.userId;
        try {
          const user = await interaction.client.users.fetch(entry.userId);
          tag = user.tag;
        } catch {}
        return `\`${idx + 1}.\` **${tag}** – Level **${entry.level}**, XP **${entry.xp}**`;
      })
    );

    await interaction.reply({
      embeds: [
        {
          title: "Top 10 – Level Leaderboard",
          color: 0x6a00ff,
          description: lines.join("\n")
        }
      ]
    });
  }
};

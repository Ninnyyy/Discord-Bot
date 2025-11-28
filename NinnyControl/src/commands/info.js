const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Show NinnyControl bot stats & info."),
  async execute(interaction, client) {
    const guildCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const stats = client.stats || {};

    await interaction.reply({
      embeds: [
        {
          title: "NinnyControl Info",
          color: 0x6a00ff,
          fields: [
            { name: "Servers", value: guildCount.toString(), inline: true },
            { name: "Cached Users", value: userCount.toString(), inline: true },
            { name: "Commands Run", value: (stats.commandsRun || 0).toString(), inline: true },
            { name: "Warnings Given", value: (stats.warningsGiven || 0).toString(), inline: true },
            { name: "Mutes Issued", value: (stats.mutesIssued || 0).toString(), inline: true },
            { name: "Spam Events", value: (stats.spamEvents || 0).toString(), inline: true },
            { name: "Messages Seen", value: (stats.messagesSeen || 0).toString(), inline: true },
            { name: "Tickets Opened", value: (stats.ticketsOpened || 0).toString(), inline: true }
          ]
        }
      ]
    });
  }
};

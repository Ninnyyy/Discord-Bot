const { SlashCommandBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open a private ticket channel."),
  async execute(interaction, client) {
    const guild = interaction.guild;
    const user = interaction.user;

    const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}-${user.id.slice(-4)}`;
    const existing = guild.channels.cache.find(ch => ch.name === channelName);
    if (existing) {
      return interaction.reply({ content: `You already have an open ticket: ${existing}`, ephemeral: true });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: ["ViewChannel"]
        },
        {
          id: user.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"]
        }
      ]
    });

    client.stats.ticketsOpened += 1;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ninny_ticket_close")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `🎫 Ticket opened for <@${user.id}>.\nPlease describe your issue.`,
      components: [row]
    });

    await interaction.reply({ content: `Your ticket has been created: ${channel}`, ephemeral: true });
  }
};

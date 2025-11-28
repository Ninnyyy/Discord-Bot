const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Send a verification button message.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ninny_verify")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: "Click the button below to verify and receive your role.",
      components: [row]
    });
  }
};

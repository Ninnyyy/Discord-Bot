const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { writeJson } = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Create a reaction role message.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(opt =>
      opt.setName("emoji")
        .setDescription("Emoji to use (standard or custom)")
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("Role to assign")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("text")
        .setDescription("Message to show")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const emojiInput = interaction.options.getString("emoji");
    const role = interaction.options.getRole("role");
    const text = interaction.options.getString("text");
    const guildId = interaction.guild.id;

    const msg = await interaction.channel.send(text);
    await interaction.reply({ content: "Reaction role message created.", ephemeral: true });

    try {
      await msg.react(emojiInput);
    } catch (err) {
      return interaction.followUp({ content: "Failed to react with that emoji. Make sure it’s valid.", ephemeral: true });
    }

    let emojiKey = emojiInput;
    const customMatch = emojiInput.match(/<a?:\w+:(\d+)>/);
    if (customMatch) emojiKey = customMatch[1];

    if (!client.reactionRoles[guildId]) client.reactionRoles[guildId] = [];
    client.reactionRoles[guildId].push({
      messageId: msg.id,
      emoji: emojiKey,
      roleId: role.id
    });

    writeJson("reactionroles", client.reactionRoles);
  }
};

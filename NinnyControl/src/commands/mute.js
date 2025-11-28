const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute or unmute a user via a Muted role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User to mute/unmute")
        .setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName("mute")
        .setDescription("True = mute, False = unmute")
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("Muted role (if not set, bot attempts to find 'Muted')")
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("reason")
        .setDescription("Reason for the mute/unmute")
        .setRequired(false)
    ),
  async execute(interaction, client) {
    const target = interaction.options.getUser("user");
    const mute = interaction.options.getBoolean("mute");
    const reason = interaction.options.getString("reason") || "No reason provided.";
    let role = interaction.options.getRole("role");

    if (!interaction.guild) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "Could not find that member in this server.", ephemeral: true });
    }

    if (!role) {
      role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
    }

    if (!role) {
      return interaction.reply({ content: "Muted role not found. Please create one or specify it.", ephemeral: true });
    }

    try {
      if (mute) {
        await member.roles.add(role, reason);
        client.stats.mutesIssued = (client.stats.mutesIssued || 0) + 1;
        await interaction.reply(`🔇 <@${target.id}> has been muted. Reason: ${reason}`);
        client.sendLog(interaction.guild, {
          title: "User Muted",
          description: `<@${target.id}> was muted.`,
          fields: [
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          ]
        });
      } else {
        await member.roles.remove(role, reason);
        await interaction.reply(`🔊 <@${target.id}> has been unmuted. Reason: ${reason}`);
        client.sendLog(interaction.guild, {
          title: "User Unmuted",
          description: `<@${target.id}> was unmuted.`,
          fields: [
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: interaction.user.tag, inline: true }
          ]
        });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "Failed to mute/unmute. Check my role permissions.", ephemeral: true });
    }
  }
};

const { createHelpEmbed } = require('../utils/embeds');

module.exports = {
  name: 'help',
  description: 'Affiche l\'aide des commandes',
  execute(message) {
    message.channel.send({ embeds: [createHelpEmbed()] });
  }
};
const { createQueueEmbed } = require('../utils/embeds');

module.exports = {
  name: 'queue',
  description: 'Affiche la file d\'attente',
  execute(message) {
    const queue = message.client.player.nodes.get(message.guild.id);

    if (!queue || !queue.node.isPlaying()) {
      return message.reply('❌ Aucune musique n\'est en cours de lecture!');
    }

    message.channel.send({ embeds: [createQueueEmbed(queue)] });
  }
};
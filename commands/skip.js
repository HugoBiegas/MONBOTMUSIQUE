module.exports = {
  name: 'skip',
  description: 'Passe à la chanson suivante',
  execute(message) {
    const queue = message.client.player.nodes.get(message.guild.id);

    if (!queue || !queue.node.isPlaying()) {
      return message.reply('❌ Aucune musique n\'est en cours de lecture!');
    }

    if (!message.member.voice.channel) {
      return message.reply('❌ Vous devez être dans un canal vocal pour utiliser cette commande!');
    }

    if (message.guild.members.me.voice.channel && message.member.voice.channel.id !== message.guild.members.me.voice.channel.id) {
      return message.reply('❌ Vous devez être dans le même canal vocal que moi!');
    }

    const currentTrack = queue.currentTrack;
    queue.node.skip();
    message.reply(`⏭️ **${currentTrack.title}** a été sauté!`);
  }
};
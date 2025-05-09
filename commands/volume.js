module.exports = {
  name: 'volume',
  description: 'Ajuste le volume',
  execute(message, args) {
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

    if (!args[0]) {
      return message.reply(`🔊 Le volume actuel est de **${queue.node.volume}%**`);
    }

    const volume = parseInt(args[0]);

    if (isNaN(volume)) {
      return message.reply('❌ Veuillez fournir un nombre valide entre 1 et 100!');
    }

    if (volume < 1 || volume > 100) {
      return message.reply('❌ Le volume doit être compris entre 1 et 100!');
    }

    try {
      queue.node.setVolume(volume);
      message.reply(`🔊 Volume ajusté à **${volume}%**`);
    } catch (error) {
      console.error('Erreur lors du réglage du volume:', error);
      message.reply('❌ Une erreur s\'est produite lors du réglage du volume!');
    }
  }
};
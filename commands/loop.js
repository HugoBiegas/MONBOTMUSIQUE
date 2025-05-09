const { QueueRepeatMode } = require('discord-player');

module.exports = {
  name: 'loop',
  description: 'Active/désactive la répétition',
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

    const mode = args[0]?.toLowerCase();
    
    try {
      if (mode === 'off' || mode === 'disable') {
        queue.setRepeatMode(QueueRepeatMode.OFF);
        return message.reply('🔄 Répétition désactivée!');
      } else if (mode === 'track' || mode === 'song') {
        queue.setRepeatMode(QueueRepeatMode.TRACK);
        return message.reply('🔂 Mode répétition: **Morceau actuel**');
      } else if (mode === 'queue' || mode === 'all') {
        queue.setRepeatMode(QueueRepeatMode.QUEUE);
        return message.reply('🔁 Mode répétition: **File d\'attente entière**');
      } else {
        // Bascule entre les modes
        const newMode = queue.repeatMode === QueueRepeatMode.OFF ? QueueRepeatMode.TRACK : (queue.repeatMode === QueueRepeatMode.TRACK ? QueueRepeatMode.QUEUE : QueueRepeatMode.OFF);
        queue.setRepeatMode(newMode);
        
        const messages = {
          [QueueRepeatMode.OFF]: '🔄 Répétition désactivée!',
          [QueueRepeatMode.TRACK]: '🔂 Mode répétition: **Morceau actuel**',
          [QueueRepeatMode.QUEUE]: '🔁 Mode répétition: **File d\'attente entière**'
        };
        
        return message.reply(messages[newMode]);
      }
    } catch (error) {
      console.error('Erreur lors du changement de mode de répétition:', error);
      message.reply('❌ Une erreur s\'est produite lors du changement de mode de répétition!');
    }
  }
};
/**
 * Module pour la création d'embeds Discord stylisés
 * Unifie la création des embeds du bot de musique
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Formate la durée en minutes:secondes
 * @param {number} duration - Durée en secondes
 * @returns {string} Durée formatée
 */
function formatDuration(duration) {
  if (!duration || isNaN(duration)) return '0:00';
  
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Crée un embed pour la lecture en cours
 * @param {Object} track - Piste en cours de lecture
 * @param {Object} queue - File d'attente
 * @returns {EmbedBuilder} L'embed créé
 */
function createNowPlayingEmbed(track, queue) {
  if (!track || !queue) {
    return new EmbedBuilder()
      .setDescription('Erreur: informations manquantes')
      .setColor('Red');
  }

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle('🎵 En cours de lecture')
    .setDescription(`**[${track.title || 'Titre inconnu'}](${track.url || 'https://discord.com'})**`)
    .setThumbnail(track.thumbnail || 'https://i.imgur.com/2KU57w2.png');

  // Ajouter les champs seulement s'ils existent
  if (track.duration) {
    embed.addFields({ name: 'Durée', value: formatDuration(track.duration), inline: true });
  }
  
  if (track.requestedBy) {
    embed.addFields({ name: 'Demandé par', value: `<@${track.requestedBy.id}>`, inline: true });
  }

  // Afficher le nombre de pistes dans la file d'attente
  const queueSize = getQueueSize(queue);
  embed.addFields({ name: 'File d\'attente', value: `${queueSize} morceaux restants`, inline: true });

  // Afficher le volume et le mode de répétition
  const footerInfo = getQueueFooterInfo(queue);
  if (footerInfo) {
    embed.setFooter({ text: footerInfo });
  }
  
  return embed;
}

/**
 * Crée un embed pour la file d'attente
 * @param {Object} queue - File d'attente
 * @param {string} title - Titre de l'embed
 * @returns {EmbedBuilder} L'embed créé
 */
function createQueueEmbed(queue, title = '📜 File d\'attente') {
  if (!queue || !queue.currentTrack) {
    return new EmbedBuilder()
      .setColor('Red')
      .setTitle('Erreur')
      .setDescription('Aucune file d\'attente en cours');
  }

  const currentTrack = queue.currentTrack;
  
  // Récupérer les pistes de la file d'attente
  const tracks = getTracksFromQueue(queue);

  // Créer la liste des pistes (limité à 10)
  const trackList = tracks.slice(0, 10).map((track, i) => {
    return `${i + 1}. **[${track.title || 'Titre inconnu'}](${track.url || 'https://discord.com'})** - <@${track.requestedBy?.id || 'Inconnu'}>`;
  });

  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle(title)
    .setDescription(`**En cours de lecture:** [${currentTrack.title || 'Titre inconnu'}](${currentTrack.url || 'https://discord.com'})\n\n${trackList.join('\n')}${tracks.length > 10 ? `\n...et ${tracks.length - 10} de plus` : ''}`)
    .setThumbnail(currentTrack.thumbnail || 'https://i.imgur.com/2KU57w2.png');

  // Afficher le nombre de pistes et le volume
  const tracksSize = tracks.length;
  const volume = queue.node && typeof queue.node.volume === 'number' ? queue.node.volume : 100;

  embed.setFooter({ text: `${tracksSize} morceaux dans la file d'attente | Volume: ${volume}%` });

  return embed;
}

/**
 * Crée un embed d'aide
 * @returns {EmbedBuilder} L'embed d'aide
 */
function createHelpEmbed() {
  const embed = new EmbedBuilder()
    .setColor(config.color)
    .setTitle('🎵 Commandes du Bot de Musique')
    .setDescription('Voici les commandes disponibles :')
    .addFields(
      { name: `${config.prefix}play [chanson/playlist]`, value: 'Joue une chanson ou une playlist (YouTube/Spotify)', inline: false },
      { name: `${config.prefix}skip`, value: 'Passe à la chanson suivante', inline: true },
      { name: `${config.prefix}pause`, value: 'Met la musique en pause', inline: true },
      { name: `${config.prefix}resume`, value: 'Reprend la lecture', inline: true },
      { name: `${config.prefix}stop`, value: 'Arrête la musique et déconnecte le bot', inline: true },
      { name: `${config.prefix}queue`, value: 'Affiche la file d\'attente', inline: true },
      { name: `${config.prefix}loop`, value: 'Active/désactive la répétition', inline: true },
      { name: `${config.prefix}volume [1-100]`, value: 'Ajuste le volume', inline: true },
      { name: `${config.prefix}help`, value: 'Affiche ce message d\'aide', inline: true }
    )
    .setFooter({ text: 'Bot de musique créé avec ❤️' });

  return embed;
}

/**
 * Récupère la taille de la file d'attente
 * @param {Object} queue - File d'attente
 * @returns {number} Nombre de pistes
 */
function getQueueSize(queue) {
  if (!queue || !queue.tracks) return 0;
  
  if (typeof queue.tracks.size === 'number') {
    return queue.tracks.size;
  }
  
  if (Array.isArray(queue.tracks.data)) {
    return queue.tracks.data.length;
  }
  
  return 0;
}

/**
 * Récupère les pistes de la file d'attente
 * @param {Object} queue - File d'attente
 * @returns {Array} Tableau de pistes
 */
function getTracksFromQueue(queue) {
  if (!queue || !queue.tracks) return [];
  
  if (queue.tracks.data && Array.isArray(queue.tracks.data)) {
    return queue.tracks.data;
  }
  
  if (typeof queue.tracks.map === 'function') {
    return Array.from(queue.tracks);
  }
  
  return [];
}

/**
 * Récupère les informations pour le footer de l'embed
 * @param {Object} queue - File d'attente
 * @returns {string} Texte du footer
 */
function getQueueFooterInfo(queue) {
  if (!queue || !queue.node) return null;
  
  const volume = typeof queue.node.volume === 'number' ? queue.node.volume : 100;
  
  let repeatMode = '';
  if (queue.repeatMode !== undefined) {
    repeatMode = queue.repeatMode ? 'Répétition activée' : 'Répétition désactivée';
  }
  
  return `Volume: ${volume}%${repeatMode ? ` | ${repeatMode}` : ''}`;
}

module.exports = {
  createNowPlayingEmbed,
  createQueueEmbed,
  createHelpEmbed,
  formatDuration
};
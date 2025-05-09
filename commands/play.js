/**
 * Commande play - Permet de jouer de la musique depuis différentes sources
 * avec qualité audio optimale (YouTube, Spotify, etc.)
 */

const { PermissionFlagsBits } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
  name: 'play',
  description: 'Joue une chanson ou une playlist (YouTube, Spotify, etc.) avec qualité optimale',
  async execute(message, args) {
    // Vérifier que des arguments ont été fournis
    if (!args.length) {
      return message.reply('❌ Veuillez spécifier une chanson ou une playlist!');
    }

    const query = args.join(' ');
    const voiceChannel = message.member.voice.channel;

    // Vérifications préliminaires
    if (!await verifyVoiceChannelPermissions(message, voiceChannel)) {
      return; // Les vérifications ont échoué, un message d'erreur a déjà été envoyé
    }

    // Message de chargement
    const loadingMsg = await message.channel.send('🔍 Recherche en cours...');

    try {
      // Déterminer le type de source (Spotify ou YouTube)
      const isSpotify = query.includes('spotify.com');
      const sourceType = isSpotify ? 'Spotify' : 'YouTube';
      
      logger.info(`Recherche ${sourceType}: "${query}" demandée par ${message.author.tag} dans ${message.guild.name}`);
      loadingMsg.edit(`🔍 Recherche ${sourceType} en cours...`);
      
      // Accéder au player à travers client pour compatibilité
      const player = message.client.player;
      
      if (!player) {
        return loadingMsg.edit('❌ Erreur interne: le lecteur audio n\'est pas initialisé');
      }
      
      try {
        // Nouvelle API v7: player.play pour jouer directement à partir d'un query
        const { track, queue } = await player.play(voiceChannel, query, {
          nodeOptions: {
            // Volume initial et métadonnées
            volume: config.defaultVolume || 70,
            metadata: {
              channel: message.channel,
              client: message.client,
              requestedBy: message.author
            },
            // Options de comportement
            leaveOnEmpty: config.player.leaveOnEmpty,
            leaveOnEmptyCooldown: config.player.leaveOnEmptyCooldown,
            leaveOnEnd: config.player.leaveOnEnd,
            leaveOnEndCooldown: config.player.leaveOnEndCooldown,
            // Options audio
            bufferingTimeout: config.player.bufferingTimeout,
            spotifyBridge: true,
            skipOnNoStream: true
          },
          searchEngine: isSpotify ? 'spotifySearch' : 'auto'
        });
        
        // Message de confirmation basé sur si c'est une playlist ou non
        if (track.playlist) {
          const trackCount = track.playlist.tracks.length;
          const totalDuration = calculateTotalDuration(track.playlist.tracks);
          const formattedDuration = formatDuration(totalDuration);
          
          loadingMsg.edit(`✅ **${trackCount} morceaux** de la playlist **${track.playlist.title}** (${sourceType}) ont été ajoutés à la file d'attente!\n⏱️ Durée totale: **${formattedDuration}**`);
        } else {
          const trackDuration = formatDuration(track.duration);
          loadingMsg.edit(`✅ **${track.title}** (${sourceType} • ${trackDuration}) a été ajouté à la file d'attente!`);
        }
        
        logger.music(`Lecture démarrée dans ${message.guild.name} (Source: ${sourceType})`);
      } catch (error) {
        logger.error(`Erreur lors de la recherche/lecture "${query}"`, error);
        loadingMsg.edit(`❌ Erreur lors de la recherche/lecture: ${error.message}`);
      }
    } catch (error) {
      logger.error(`Erreur lors de la commande play dans ${message.guild.name}`, error);
      loadingMsg.edit(`❌ Une erreur s'est produite: ${error.message}`);
    }
  }
};

/**
 * Vérifie les permissions du canal vocal
 * @param {Message} message - Message Discord
 * @param {VoiceChannel} voiceChannel - Canal vocal
 * @returns {Promise<boolean>} True si les vérifications sont passées
 */
async function verifyVoiceChannelPermissions(message, voiceChannel) {
  // Vérification du canal vocal
  if (!voiceChannel) {
    await message.reply('❌ Vous devez être dans un canal vocal pour utiliser cette commande!');
    return false;
  }

  // Permissions
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
    await message.reply('❌ Je n\'ai pas les permissions pour rejoindre et parler dans votre canal vocal!');
    return false;
  }

  return true;
}

/**
 * Calcule la durée totale d'une liste de pistes
 * @param {Array<Track>} tracks - Liste des pistes
 * @returns {number} Durée totale en millisecondes
 */
function calculateTotalDuration(tracks) {
  if (!tracks || !Array.isArray(tracks)) return 0;
  return tracks.reduce((total, track) => total + (track.duration || 0), 0);
}

/**
 * Formate le temps en millisecondes en format lisible (mm:ss)
 * @param {number} ms - Temps en millisecondes
 * @returns {string} Temps formaté
 */
function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
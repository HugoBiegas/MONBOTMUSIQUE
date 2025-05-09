/**
 * Commande play - Permet de jouer de la musique depuis différentes sources
 * avec qualité audio optimale (YouTube, Spotify, etc.)
 */

const { PermissionFlagsBits } = require('discord.js');
const { searchYouTube, createYouTubeQueue, calculateTotalDuration } = require('../utils/youtubeManager');
const { searchSpotify, createSpotifyQueue, formatDuration } = require('../utils/spotifyManager');
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
      
      logger.info(`Recherche ${sourceType}: "${query}" demandée par ${message.author.tag}`);
      loadingMsg.edit(`🔍 Recherche ${sourceType} en cours...`);
      
      // Effectuer la recherche selon la source
      const searchResult = isSpotify 
        ? await searchSpotify(query, message.client.player, message.author)
        : await searchYouTube(query, message.client.player, message.author);
      
      if (!searchResult.success) {
        loadingMsg.edit(searchResult.message);
        return;
      }
      
      // Pour débogage - afficher plus d'informations sur les pistes trouvées
      const { result } = searchResult;
      logger.debug(`Pistes trouvées: ${result.tracks.length}` + 
                  (result.playlist ? ` dans la playlist "${result.playlist.title}"` : ''));
      
      // Vérifier si les pistes ont des URLs valides
      if (result.tracks.length > 0) {
        logger.debug(`Première piste: ${result.tracks[0].title}, URL: ${result.tracks[0].url || 'Non définie'}`);
      }
      
      // Création ou récupération de la file d'attente selon la source
      const queue = isSpotify
        ? createSpotifyQueue(message.client.player, message.guild, {
            channel: message.channel,
            client: message.client,
            requestedBy: message.author
          })
        : createYouTubeQueue(message.client.player, message.guild, {
            channel: message.channel,
            client: message.client,
            requestedBy: message.author
          });

      try {
        // Connexion au canal vocal si nécessaire
        if (!queue.connection) {
          await queue.connect(voiceChannel);
          logger.music(`Connecté au canal vocal "${voiceChannel.name}" dans ${message.guild.name}`);
        }
      } catch (error) {
        message.client.player.nodes.delete(message.guild.id);
        loadingMsg.edit(`❌ Impossible de rejoindre le canal vocal: ${error.message}`);
        logger.error(`Erreur lors de la connexion au canal vocal`, error);
        return;
      }

      // Mise à jour du message selon le type de résultat
      if (result.playlist) {
        // Playlist détectée
        queue.addTrack(result.tracks);
        
        // Calculer les informations de la playlist
        const trackCount = result.tracks.length;
        const totalDuration = formatDuration(calculateTotalDuration(result.tracks));
        const playlistSource = isSpotify ? 'Spotify' : 'YouTube';
        
        loadingMsg.edit(`✅ **${trackCount} morceaux** de la playlist **${result.playlist.title}** (${playlistSource}) ont été ajoutés à la file d'attente!\n⏱️ Durée totale: **${totalDuration}**`);
      } else {
        // Piste unique
        const track = result.tracks[0];
        queue.addTrack(track);
        
        const trackSource = isSpotify ? 'Spotify' : 'YouTube';
        const trackDuration = formatDuration(track.duration);
        
        loadingMsg.edit(`✅ **${track.title}** (${trackSource} • ${trackDuration}) a été ajouté à la file d'attente!`);
      }

      // Lancer la lecture si nécessaire
      if (!queue.node.isPlaying()) {
        try {
          await queue.node.play();
          logger.music(`Lecture démarrée dans ${message.guild.name} (Source: ${sourceType})`);
        } catch (playError) {
          logger.error(`Erreur lors du démarrage de la lecture`, playError);
          loadingMsg.edit(`❌ Erreur lors du démarrage de la lecture: ${playError.message}`);
        }
      }

    } catch (error) {
      logger.error(`Erreur lors de la commande play`, error);
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
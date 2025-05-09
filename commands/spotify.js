/**
 * Commande spotify - Permet de jouer de la musique depuis Spotify
 * avec qualité audio optimale
 */

const { PermissionFlagsBits } = require('discord.js');
const { searchSpotify, createSpotifyQueue, formatDuration } = require('../utils/spotifyManager');
const { calculateTotalDuration } = require('../utils/youtubeManager');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
  name: 'spotify',
  description: 'Joue une chanson ou une playlist Spotify avec qualité optimale',
  async execute(message, args) {
    // Vérifier que des arguments ont été fournis
    if (!args.length) {
      return message.reply('❌ Veuillez spécifier une chanson ou une playlist Spotify!');
    }

    // Vérifier si Spotify est configuré
    if (!config.spotify || !config.spotify.clientId || !config.spotify.clientSecret) {
      return message.reply('❌ Configuration Spotify manquante! Veuillez configurer vos identifiants Spotify dans config.json.');
    }

    const query = args.join(' ');
    const voiceChannel = message.member.voice.channel;

    // Vérifications préliminaires
    if (!await verifyVoiceChannelPermissions(message, voiceChannel)) {
      return; // Les vérifications ont échoué, un message d'erreur a déjà été envoyé
    }

    // Si ce n'est pas un lien Spotify, on ajuste la requête
    let finalQuery = query;
    if (!query.includes('spotify.com')) {
      finalQuery = `spotify:${query}`; // Force la recherche Spotify
    }

    // Message de chargement
    const loadingMsg = await message.channel.send('🔍 Recherche Spotify en cours...');

    try {
      // Recherche Spotify optimisée
      const searchResult = await searchSpotify(finalQuery, message.client.player, message.author);
      
      if (!searchResult.success) {
        loadingMsg.edit(searchResult.message);
        return;
      }
      
      // Débogage - vérifier le contenu des résultats
      const { result } = searchResult;
      logger.debug(`Pistes Spotify trouvées: ${result.tracks.length}` + 
                  (result.playlist ? ` dans la playlist "${result.playlist.title}"` : ''));
      
      if (result.tracks.length > 0) {
        logger.debug(`Première piste Spotify: ${result.tracks[0].title}, URL: ${result.tracks[0].url || 'Non définie'}`);
      }
      
      // Création de la file d'attente optimisée pour Spotify
      const queue = createSpotifyQueue(
        message.client.player,
        message.guild,
        {
          channel: message.channel,
          client: message.client,
          requestedBy: message.author
        }
      );

      try {
        // Connexion au canal vocal si nécessaire
        if (!queue.connection) {
          await queue.connect(voiceChannel);
          logger.music(`Connecté au canal vocal "${voiceChannel.name}" pour Spotify dans ${message.guild.name}`);
        }
      } catch (error) {
        message.client.player.nodes.delete(message.guild.id);
        loadingMsg.edit(`❌ Impossible de rejoindre le canal vocal: ${error.message}`);
        logger.error(`Erreur lors de la connexion au canal vocal`, error);
        return;
      }

      // Mise à jour du message selon le type de résultat
      if (result.playlist) {
        // Playlist Spotify détectée
        queue.addTrack(result.tracks);
        
        // Calculer les informations de la playlist
        const trackCount = result.tracks.length;
        const totalDuration = formatDuration(calculateTotalDuration(result.tracks));
        const playlistTitle = result.playlist.title || 'Playlist Spotify';
        const playlistAuthor = result.playlist?.author?.name || 'Spotify';
        
        const playlistEmbed = `
✅ **${trackCount} morceaux** de la playlist Spotify **${playlistTitle}** ont été ajoutés à la file d'attente!
⏱️ Durée totale: **${totalDuration}**
👤 Créée par: **${playlistAuthor}**
🎵 Lecture avec qualité audio optimale
        `.trim();
        
        loadingMsg.edit(playlistEmbed);
      } else {
        // Piste Spotify unique
        const track = result.tracks[0];
        queue.addTrack(track);
        
        const trackDuration = formatDuration(track.duration);
        const trackAuthor = track.author;
        
        const trackEmbed = `
✅ **${track.title}** a été ajouté à la file d'attente!
👤 Artiste: **${trackAuthor}**
⏱️ Durée: **${trackDuration}**
🎵 Lecture Spotify avec qualité audio optimale
        `.trim();
        
        loadingMsg.edit(trackEmbed);
      }

      // Lancer la lecture si nécessaire
      if (!queue.node.isPlaying()) {
        try {
          await queue.node.play();
          logger.music(`Lecture Spotify démarrée dans ${message.guild.name}`);
        } catch (playError) {
          logger.error(`Erreur lors du démarrage de la lecture Spotify`, playError);
          loadingMsg.edit(`❌ Erreur lors du démarrage de la lecture: ${playError.message}`);
        }
      }

    } catch (error) {
      logger.error(`Erreur lors de la commande spotify`, error);
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
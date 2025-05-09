/**
 * Gestionnaire centralisé des événements du lecteur audio
 * Optimisé pour une meilleure qualité et gestion d'erreurs
 */

const logger = require('../utils/logger');
const { formatDuration } = require('../utils/spotifyManager');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/**
 * Crée un embed pour la lecture en cours avec qualité optimale
 * @param {Object} track - Piste en cours de lecture
 * @param {Object} queue - File d'attente
 * @returns {EmbedBuilder} L'embed créé
 */
function createNowPlayingEmbed(track, queue) {
  if (!track) return null;
  
  // Déterminer la source (Spotify, YouTube, etc.)
  const isSpotify = track.url && track.url.includes('spotify');
  const isYouTube = track.url && (track.url.includes('youtube') || track.url.includes('youtu.be'));
  
  let sourceIcon = '🎵';
  let sourceColor = config.color;
  let sourceText = 'Audio';
  
  if (isSpotify) {
    sourceIcon = '<:spotify:1234567890>'; // Remplacer avec l'ID de votre émoji personnalisé si disponible
    sourceColor = '#1DB954';
    sourceText = 'Spotify';
  } else if (isYouTube) {
    sourceIcon = '<:youtube:1234567890>'; // Remplacer avec l'ID de votre émoji personnalisé si disponible
    sourceColor = '#FF0000';
    sourceText = 'YouTube';
  }
  
  // Créer l'embed avec informations détaillées
  const embed = new EmbedBuilder()
    .setColor(sourceColor)
    .setTitle(`${sourceIcon} En cours de lecture (${sourceText})`)
    .setDescription(`**[${track.title || 'Titre inconnu'}](${track.url || 'https://discord.com'})**`)
    .setThumbnail(track.thumbnail || 'https://i.imgur.com/2KU57w2.png');
  
  // Ajouter les informations audio
  embed.addFields(
    { name: '👤 Artiste/Auteur', value: track.author || 'Inconnu', inline: true },
    { name: '⏱️ Durée', value: formatDuration(track.duration) || '0:00', inline: true }
  );
  
  // Ajouter des informations sur la qualité audio
  const audioQuality = isSpotify ? 'HQ' : (isYouTube ? 'HD' : 'Standard');
  embed.addFields(
    { name: '🔊 Qualité', value: audioQuality, inline: true },
    { name: '👀 Demandé par', value: track.requestedBy ? `<@${track.requestedBy.id}>` : 'Inconnu', inline: true }
  );
  
  // Ajouter des informations sur la file d'attente
  const queueSize = queue ? (queue.tracks?.data?.length || 0) : 0;
  const volume = queue?.node?.volume || config.defaultVolume;
  
  if (queue) {
    embed.addFields(
      { name: '📜 File d\'attente', value: `${queueSize} morceau(x) en attente`, inline: true },
      { name: '🔉 Volume', value: `${volume}%`, inline: true }
    );
  }
  
  // Informations supplémentaires dans le footer
  embed.setFooter({ 
    text: `${sourceText} 🔊 Qualité audio optimisée • Utilisez ${config.prefix}help pour voir les commandes`
  });
  
  return embed;
}

/**
 * Initialise tous les gestionnaires d'événements pour le lecteur
 * @param {Player} player - Instance du lecteur discord-player
 */
function registerPlayerEvents(player) {
  // Événement : Début de lecture d'une piste
  player.events.on('playerStart', (queue, track) => {
    logger.music(`Lecture de "${track.title}" démarrée sur ${queue.guild.name}`);
    
    // Déterminer la source pour le logging
    const isSpotify = track.url && track.url.includes('spotify');
    const isYouTube = track.url && (track.url.includes('youtube') || track.url.includes('youtu.be'));
    const sourceType = isSpotify ? 'Spotify' : (isYouTube ? 'YouTube' : 'Audio');
    
    logger.music(`Source: ${sourceType}, Qualité: ${isSpotify ? 'HQ' : (isYouTube ? 'HD' : 'Standard')}`);
    
    if (queue?.metadata?.channel) {
      try {
        const embed = createNowPlayingEmbed(track, queue);
        if (embed) {
          queue.metadata.channel.send({ embeds: [embed] })
            .catch(error => logger.error('Erreur lors de l\'envoi de l\'embed', error));
        }
      } catch (embedError) {
        logger.error('Erreur lors de la création de l\'embed', embedError);
        // Fallback en cas d'erreur avec l'embed
        queue.metadata.channel.send(`🎵 En cours de lecture: **${track.title}**`)
          .catch(msgError => logger.error('Erreur de message de secours', msgError));
      }
    }
  });

  // Événement : Erreur du player
  player.events.on('error', (queue, error) => {
    logger.error(`Erreur Player (Serveur ${queue?.guild?.name || 'inconnu'})`, error);
    
    if (queue?.metadata?.channel) {
      queue.metadata.channel.send(`⚠️ Erreur de lecture: ${error.message}. Tentative de récupération...`);
    }
    
    // Tenter de récupérer automatiquement
    try {
      if (queue?.node?.isPlaying()) {
        logger.info('Tentative de récupération en cours...');
        setTimeout(() => {
          try {
            if (queue?.node?.skip) queue.node.skip().catch(() => {});
          } catch (e) {
            logger.error('Échec de la récupération automatique', e);
          }
        }, 2000);
      }
    } catch (e) {
      logger.error('Erreur lors de la tentative de récupération', e);
    }
  });

  // Événement : Erreur du lecteur audio
  player.events.on('playerError', (queue, error) => {
    logger.error(`Erreur Lecteur (Serveur ${queue?.guild?.name || 'inconnu'})`, error);
    
    if (queue?.metadata?.channel) {
      queue.metadata.channel.send(`⚠️ Erreur audio: ${error.message}. Tentative de passage à la piste suivante...`);
    }
    
    // Tenter de passer à la piste suivante automatiquement
    if (queue?.tracks?.data?.length > 0) {
      logger.info('Passage à la piste suivante après erreur...');
      setTimeout(() => {
        try {
          if (queue?.node?.skip) queue.node.skip().catch(e => logger.error('Impossible de passer à la piste suivante', e));
        } catch (e) {
          logger.error('Erreur lors du passage à la piste suivante', e);
        }
      }, 2000);
    }
  });

  // Événement : File d'attente vide
  player.events.on('emptyQueue', (queue) => {
    logger.music(`File d'attente terminée sur ${queue.guild.name}`);
    
    if (queue?.metadata?.channel) {
      queue.metadata.channel.send('✅ File d\'attente terminée ! Déconnexion...')
        .catch(error => logger.error('Erreur lors de l\'envoi du message de fin', error));
    }
  });

  // Événement : Erreur de connexion
  player.events.on('connectionError', (queue, error) => {
    logger.error(`Erreur de connexion (Serveur ${queue?.guild?.name || 'inconnu'})`, error);
    
    if (queue?.metadata?.channel) {
      queue.metadata.channel.send(`⚠️ Erreur de connexion: ${error.message}. Tentative de reconnexion...`);
      
      // Tenter de reconnecter automatiquement
      setTimeout(() => {
        try {
          if (queue?.connection && typeof queue.connection.rejoin === 'function') {
            queue.connection.rejoin().catch(() => {});
          }
        } catch (e) {
          logger.error('Erreur lors de la tentative de reconnexion', e);
        }
      }, 5000);
    }
  });

  // Événement : Canal vocal vide
  player.events.on('emptyChannel', (queue) => {
    logger.music(`Canal vocal vide sur ${queue.guild.name}`);
    
    if (queue?.metadata?.channel) {
      queue.metadata.channel.send('👋 Tous les utilisateurs ont quitté le canal vocal. Déconnexion...');
    }
  });

  // Événement : Ajout d'une piste
  player.events.on('trackAdd', (queue, track) => {
    logger.music(`Piste "${track.title}" ajoutée à la file d'attente sur ${queue.guild.name}`);
  });

  // Événement : Ajout d'une playlist
  player.events.on('playlistAdd', (queue, playlist) => {
    logger.music(`Playlist "${playlist.title}" (${playlist.tracks.length} pistes) ajoutée sur ${queue.guild.name}`);
  });

  // Événement : Suivi audio (pour débogage qualité)
  player.events.on('debug', (queue, message) => {
    if (message.includes('quality') || message.includes('audio')) {
      logger.debug(`[Audio Debug] ${message}`);
    }
  });

  logger.info('✅ Événements du lecteur audio enregistrés avec optimisations qualité');
}

module.exports = { registerPlayerEvents };
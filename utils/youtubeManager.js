/**
 * Module de gestion YouTube avec qualité audio optimale
 * Intégration complète avec Discord-Player
 */

const { QueryType } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const logger = require('./logger');
const config = require('../config.json');

/**
 * Configure l'extracteur YouTube pour une qualité maximale
 * @param {Player} player - Instance Discord-Player
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function setupYouTubeExtractor(player) {
  try {
    logger.info('🎬 Configuration de l\'extracteur YouTube pour une qualité HD...');
    
    // Options pour l'extracteur YouTube
    const youtubeOptions = {
      // Options pour la qualité audio
      quality: 'highestaudio',
      // Augmenter la mémoire tampon pour une lecture plus fluide
      highWaterMark: config.ytdlOptions.highWaterMark || 67108864,
      // Options additionnelles
      requestOptions: {
        headers: {
          'Cookie': 'highQuality=true'
        }
      }
    };
    
    // Enregistrer l'extracteur YoutubeiExtractor (alternative pour discord-player v7)
    await player.extractors.register(YoutubeiExtractor, youtubeOptions);
    
    logger.info('✅ Extracteur YouTube configuré avec qualité audio maximale');
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de la configuration de l\'extracteur YouTube', error);
    return false;
  }
}

/**
 * Recherche optimisée pour YouTube avec gestion de différents types de contenus
 * @param {string} query - Requête de recherche
 * @param {Player} player - Instance Discord-Player
 * @param {User} requestedBy - Utilisateur ayant demandé la recherche
 * @returns {Promise<Object>} Résultat de la recherche
 */
async function searchYouTube(query, player, requestedBy) {
  try {
    // Déterminer le type de recherche YouTube
    const isYouTubeUrl = query.includes('youtube.com') || query.includes('youtu.be');
    const isPlaylist = query.includes('list=');
    
    // Optimiser le QueryType selon le type de contenu
    let searchEngine = isYouTubeUrl ? 
      (isPlaylist ? QueryType.YOUTUBE_PLAYLIST : QueryType.YOUTUBE) : 
      QueryType.AUTO;
    
    if (isYouTubeUrl) {
      logger.debug(`URL YouTube détectée: ${isPlaylist ? 'Playlist' : 'Vidéo'}`);
    }
    
    // Options de recherche optimisées pour YouTube
    const searchOptions = {
      requestedBy: requestedBy,
      // Dans v7, on utilise searchEngine normalement (QueryType) 
      // et non plus des identificateurs d'extracteur
      searchEngine: searchEngine,
      blockExtractors: false,
      fetchBeforeQueued: true,
      ytdlOptions: config.ytdlOptions
    };
    
    // Ajouter des timeouts pour éviter les blocages
    const searchPromise = player.search(query, searchOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Délai de recherche dépassé')), 20000)
    );
    
    // Recherche avec timeout
    const result = await Promise.race([searchPromise, timeoutPromise]);
    
    if (!result || !result.tracks || result.tracks.length === 0) {
      return { 
        success: false, 
        message: '❌ Aucun résultat trouvé! Vérifiez que le lien ou le titre est correct.' 
      };
    }
    
    // Optimiser le résultat pour les playlists volumineuses
    if (result.playlist && result.tracks.length > 200) {
      logger.info(`⚠️ Playlist YouTube volumineuse détectée (${result.tracks.length} pistes), optimisation en cours...`);
      // Limiter le nombre de pistes pour éviter les problèmes de mémoire
      result.tracks = result.tracks.slice(0, 200);
      logger.info('✅ Playlist redimensionnée pour une performance optimale');
    }
    
    return { success: true, result };
  } catch (error) {
    logger.error('❌ Erreur lors de la recherche YouTube', error);
    return { 
      success: false, 
      message: `❌ Erreur lors de la recherche: ${error.message}` 
    };
  }
}

/**
 * Crée une file d'attente optimisée pour YouTube
 * @param {Player} player - Instance Discord-Player
 * @param {Guild} guild - Serveur Discord
 * @param {Object} metadata - Métadonnées pour la file
 * @returns {GuildQueue} File d'attente créée
 */
function createYouTubeQueue(player, guild, metadata) {
  // Options optimisées pour la qualité audio
  const queueOptions = {
    metadata,
    selfDeaf: true,
    volume: config.defaultVolume || 70,
    leaveOnEmpty: config.player.leaveOnEmpty || true,
    leaveOnEmptyCooldown: config.player.leaveOnEmptyCooldown || 300000,
    leaveOnEnd: config.player.leaveOnEnd || true,
    leaveOnEndCooldown: config.player.leaveOnEndCooldown || 300000,
    bufferingTimeout: config.player.bufferingTimeout || 30000,
    ytdlOptions: config.ytdlOptions,
    disableVolume: false,
    smoothVolume: config.audioSettings.smoothTransition || true,
    fetchBeforeQueued: true,
    skipOnNoStream: true,
    // Options spécifiques pour YouTube
    initialVolume: config.defaultVolume || 70,
    maxSize: config.maxQueueSize || 1000
  };

  // Créer et retourner la file d'attente
  return player.nodes.create(guild, queueOptions);
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

module.exports = {
  setupYouTubeExtractor,
  searchYouTube,
  createYouTubeQueue,
  calculateTotalDuration
};
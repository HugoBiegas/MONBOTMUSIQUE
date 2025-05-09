/**
 * Module de gestion Spotify avec qualité audio optimale et débogage avancé
 * Intégration complète avec Discord-Player
 */

const { QueryType } = require('discord-player');
const { SpotifyExtractor } = require('@discord-player/extractor');
const logger = require('./logger');
const config = require('../config.json');

/**
 * Configure l'extracteur Spotify pour une qualité maximale
 * @param {Player} player - Instance Discord-Player
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function setupSpotifyExtractor(player) {
  try {
    if (!config.spotify || !config.spotify.clientId || !config.spotify.clientSecret) {
      logger.warn('⚠️ Configuration Spotify manquante dans config.json');
      return false;
    }

    // Loguer le début de configuration avec des informations partielles sur les identifiants
    const clientIdPartial = config.spotify.clientId.substring(0, 5) + '...';
    const clientSecretPartial = config.spotify.clientSecret.substring(0, 5) + '...';
    logger.info(`🎵 Configuration de l'extracteur Spotify avec ID: ${clientIdPartial}, Secret: ${clientSecretPartial}...`);
    
    // Options pour l'extracteur Spotify
    const spotifyOptions = {
      // Identifiants Spotify
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
      
      // Options importantes pour v7
      autoResolveYoutubeTracks: true, // Résoudre les pistes via YouTube
      maxPlaylistItems: 100, // Limiter les playlists volumineuses
      
      // Options de débogage
      isDebug: true // Active le mode débogage de l'extracteur
    };
    
    // Enregistrer l'extracteur Spotify
    await player.extractors.register(SpotifyExtractor, spotifyOptions);
    
    logger.info('✅ Extracteur Spotify configuré avec qualité audio maximale');
    logger.debug('Options Spotify utilisées: ' + JSON.stringify({
      ...spotifyOptions,
      clientId: clientIdPartial,
      clientSecret: clientSecretPartial
    }));
    
    return true;
  } catch (error) {
    logger.error('❌ Erreur lors de la configuration de l\'extracteur Spotify', error);
    return false;
  }
}

/**
 * Recherche optimisée pour Spotify avec gestion de différents types de contenus
 * @param {string} query - Requête de recherche
 * @param {Player} player - Instance Discord-Player
 * @param {User} requestedBy - Utilisateur ayant demandé la recherche
 * @returns {Promise<Object>} Résultat de la recherche
 */
async function searchSpotify(query, player, requestedBy) {
  try {
    // Déterminer le type de recherche Spotify
    const isSpotifyUrl = query.includes('spotify.com');
    const isPlaylist = query.includes('playlist');
    const isAlbum = query.includes('album');
    
    // Optimiser le QueryType selon le type de contenu
    let searchEngine = QueryType.SPOTIFY_SEARCH;
    
    logger.debug(`Recherche Spotify - URL: ${isSpotifyUrl ? 'Oui' : 'Non'}, Playlist: ${isPlaylist ? 'Oui' : 'Non'}, Album: ${isAlbum ? 'Oui' : 'Non'}`);
    
    // Vérifier les extracteurs chargés
    const extractors = player.extractors.all();
    logger.debug(`Extracteurs disponibles: ${extractors.length}`);
    for (const ext of extractors) {
      logger.debug(`- Extracteur chargé: ${ext.name || 'Inconnu'}`);
    }
    
    // Vérifier que SpotifyExtractor est bien chargé
    const spotifyExt = extractors.find(ext => ext.constructor && ext.constructor.name === 'SpotifyExtractor');
    if (!spotifyExt) {
      logger.error('❌ SpotifyExtractor n\'est pas chargé correctement');
      return { 
        success: false, 
        message: '❌ Erreur: L\'extracteur Spotify n\'est pas disponible' 
      };
    }
    
    // Options de recherche optimisées pour Spotify
    const searchOptions = {
      requestedBy: requestedBy,
      searchEngine: searchEngine,
      // Options importantes pour v7
      spotify: {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        autoResolveYoutubeTracks: true
      },
      // Options générales
      blockExtractors: false,
      fetchBeforeQueued: true
    };
    
    logger.debug(`Recherche Spotify avec options: ${JSON.stringify({
      ...searchOptions,
      spotify: {
        clientId: config.spotify.clientId.substring(0, 5) + '...',
        clientSecret: config.spotify.clientSecret.substring(0, 5) + '...',
        autoResolveYoutubeTracks: true
      }
    })}`);
    
    // Recherche avec gestion de timeout
    logger.info(`🔎 Lancement de la recherche pour "${query}"`);
    
    // Wrap la recherche dans une promesse avec timeout
    const searchWithTimeout = async (timeoutMs = 30000) => {
      return new Promise((resolve, reject) => {
        const searchPromise = player.search(query, searchOptions);
        
        // Timeout après 30 secondes
        const timeoutId = setTimeout(() => {
          reject(new Error(`Délai de recherche dépassé (${timeoutMs}ms)`));
        }, timeoutMs);
        
        // Résoudre la promesse de recherche
        searchPromise
          .then(result => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
    };
    
    // Exécuter la recherche avec un timeout
    const result = await searchWithTimeout();
    
    // Vérifier les résultats
    if (!result) {
      logger.error('❌ Aucun résultat retourné par la recherche Spotify');
      return { 
        success: false, 
        message: '❌ Aucun résultat trouvé! (Résultat null)' 
      };
    }
    
    if (!result.tracks || !Array.isArray(result.tracks)) {
      logger.error(`❌ Résultat Spotify invalide: ${JSON.stringify(result)}`);
      return { 
        success: false, 
        message: '❌ Format de résultat Spotify invalide! Assurez-vous que vos identifiants Spotify sont valides.' 
      };
    }
    
    if (result.tracks.length === 0) {
      logger.error('❌ Aucune piste trouvée dans la recherche Spotify');
      return { 
        success: false, 
        message: '❌ Aucune piste trouvée dans cette playlist! Assurez-vous que la playlist contient des pistes accessibles.' 
      };
    }
    
    // Loguer des informations sur les pistes trouvées
    logger.debug(`✅ Spotify: ${result.tracks.length} pistes trouvées` + 
                (result.playlist ? ` dans la playlist "${result.playlist.title}"` : ''));
    
    // Vérifier quelques pistes pour le débogage
    for (let i = 0; i < Math.min(3, result.tracks.length); i++) {
      const track = result.tracks[i];
      logger.debug(`Piste ${i+1}: "${track.title}" par ${track.author}, URL: ${track.url || 'Non définie'}`);
    }
    
    // Optimiser le résultat pour les playlists volumineuses
    if (result.playlist && result.tracks.length > 100) {
      logger.info(`⚠️ Playlist volumineuse détectée (${result.tracks.length} pistes), optimisation en cours...`);
      // Limiter le nombre de pistes pour éviter les problèmes de mémoire
      result.tracks = result.tracks.slice(0, 100);
      logger.info('✅ Playlist redimensionnée pour une performance optimale');
    }
    
    return { success: true, result };
  } catch (error) {
    logger.error(`❌ Erreur lors de la recherche Spotify: ${error.message}`, error);
    
    // Afficher plus de détails sur l'erreur
    if (error.stack) {
      logger.debug(`Stack trace: ${error.stack}`);
    }
    
    // Message d'erreur amélioré avec suggestions
    let errorMessage = `❌ Erreur lors de la recherche: ${error.message}`;
    
    // Suggestions basées sur le type d'erreur
    if (error.message.includes('authentication')) {
      errorMessage += "\nVérifiez vos identifiants Spotify dans config.json";
    } else if (error.message.includes('playlist') || error.message.includes('track')) {
      errorMessage += "\nVérifiez que la playlist est publique et accessible";
    } else if (error.message.includes('timeout') || error.message.includes('délai')) {
      errorMessage += "\nLe temps de réponse de Spotify est trop long, réessayez plus tard";
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

/**
 * Crée une file d'attente optimisée pour Spotify
 * @param {Player} player - Instance Discord-Player
 * @param {Guild} guild - Serveur Discord
 * @param {Object} metadata - Métadonnées pour la file
 * @returns {GuildQueue} File d'attente créée
 */
function createSpotifyQueue(player, guild, metadata) {
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
    spotifyBridge: true,
    disableVolume: false,
    smoothVolume: config.audioSettings.smoothTransition || true,
    fetchBeforeQueued: true,
    skipOnNoStream: true,
    // Options supplémentaires pour la qualité audio
    initialVolume: config.defaultVolume || 70,
    maxSize: config.maxQueueSize || 1000
  };

  // Créer et retourner la file d'attente
  return player.nodes.create(guild, queueOptions);
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

module.exports = {
  setupSpotifyExtractor,
  searchSpotify,
  createSpotifyQueue,
  formatDuration
};
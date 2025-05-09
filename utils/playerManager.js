/**
 * Module de gestion avancée du lecteur de musique
 * Fournit des fonctions pour la recherche et la gestion des pistes avec support Spotify
 */

const { QueryType } = require('discord-player');
const logger = require('./logger');

/**
 * Gère la recherche et l'extraction d'information pour différentes sources
 * @param {string} query - Requête de recherche (URL ou texte)
 * @param {Player} player - Instance du lecteur discord-player
 * @param {Message} message - Message Discord qui a déclenché la recherche
 * @returns {Promise<Object>} Résultat de la recherche
 */
async function handleSearch(query, player, message) {
  try {
    // Déterminer si c'est une URL Spotify
    const isSpotify = query.includes('spotify.com');
    
    logger.debug(`Recherche de "${query}" (${isSpotify ? 'Spotify' : 'Source standard'})`);
    
    // Options de recherche optimisées pour les playlists Spotify
    const searchOptions = {
      requestedBy: message.author,
      // Si c'est une playlist Spotify, on force le moteur de recherche Spotify
      searchEngine: isSpotify ? QueryType.SPOTIFY_SEARCH : QueryType.AUTO,
      // Options supplémentaires pour améliorer la compatibilité Spotify
      blockExtractors: false,
      fallbackSearchEngine: 'youtube',
      // Améliorations pour les playlists Spotify
      spotifyBridge: true
    };
    
    // Effectuer la recherche
    const searchResult = await player.search(query, searchOptions);

    // Vérifier si des résultats ont été trouvés
    if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
      logger.warn(`Aucun résultat trouvé pour "${query}"`);
      return { success: false, message: '❌ Aucun résultat trouvé!' };
    }

    // Journaliser le nombre de pistes trouvées
    const trackCount = searchResult.tracks.length;
    const isPlaylist = !!searchResult.playlist;
    
    if (isPlaylist) {
      logger.music(`Playlist "${searchResult.playlist.title}" trouvée (${trackCount} pistes)`);
    } else {
      logger.music(`Piste "${searchResult.tracks[0].title}" trouvée`);
    }

    return { success: true, result: searchResult };
  } catch (error) {
    logger.error(`Erreur lors de la recherche de "${query}"`, error);
    return { 
      success: false, 
      message: `❌ Erreur de recherche: ${error.message}` 
    };
  }
}

/**
 * Crée une file d'attente optimisée avec les options recommandées
 * @param {Player} player - Instance du lecteur discord-player
 * @param {Guild} guild - Serveur Discord
 * @param {Object} metadata - Métadonnées pour la file
 * @param {Object} options - Options supplémentaires
 * @returns {GuildQueue} File d'attente créée
 */
function createOptimizedQueue(player, guild, metadata, options = {}) {
  // Fusionner les options par défaut avec celles fournies
  const queueOptions = {
    metadata,
    selfDeaf: true,
    volume: options.volume || 85,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 300000, // 5 minutes
    leaveOnEnd: true,
    leaveOnEndCooldown: 300000, // 5 minutes
    bufferingTimeout: 30000, // 30 secondes
    // Optimisations pour le support Spotify
    spotifyBridge: true,
    disableVolume: false,
    smoothVolume: true,
    connectionOptions: {
      disableReconnect: false
    },
    ...options
  };

  // Créer et retourner la file d'attente
  return player.nodes.create(guild, queueOptions);
}

module.exports = {
  handleSearch,
  createOptimizedQueue
};
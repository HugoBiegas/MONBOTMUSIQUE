/**
 * Commande de test pour vérifier la configuration
 * et tester les extracteurs
 */

const { QueryType } = require('discord-player');
const logger = require('../utils/logger');
const config = require('../config.json');

module.exports = {
  name: 'test',
  description: 'Teste la configuration et les extracteurs audio',
  async execute(message, args) {
    const player = message.client.player;
    const voiceChannel = message.member.voice.channel;
    
    // Message initial
    const testMsg = await message.channel.send('🔍 Test de configuration en cours...');
    
    try {
      // 1. Vérifier la connexion Discord
      testMsg.edit('✅ Test 1/5: Bot Discord connecté');
      
      // 2. Vérifier que player est correctement initialisé
      if (!player) {
        return testMsg.edit('❌ Test 2/5: Player non initialisé');
      }
      testMsg.edit('✅ Test 2/5: Player initialisé');
      
      // 3. Vérifier les extracteurs
      const extractors = player.extractors.all();
      testMsg.edit(`✅ Test 3/5: ${extractors.length} extracteurs chargés\n` + 
                  extractors.map(ext => `- ${ext.constructor.name || 'Inconnu'}`).join('\n'));
      
      // 4. Vérifier les identifiants Spotify
      if (!config.spotify || !config.spotify.clientId || !config.spotify.clientSecret) {
        return testMsg.edit('❌ Test 4/5: Configuration Spotify manquante');
      }
      testMsg.edit('✅ Test 4/5: Configuration Spotify présente');
      
      // 5. Tester la recherche Spotify
      testMsg.edit('🔍 Test 5/5: Test de la recherche Spotify en cours...');
      
      try {
        // Effectuer une recherche simple avec un terme générique
        const searchResult = await player.search('spotify:track:4cOdK2wGLETKBW3PvgPWqT', {
          searchEngine: QueryType.SPOTIFY_SEARCH,
          requestedBy: message.author,
          spotify: {
            clientId: config.spotify.clientId,
            clientSecret: config.spotify.clientSecret,
            autoResolveYoutubeTracks: true
          }
        });
        
        if (searchResult && searchResult.tracks && searchResult.tracks.length > 0) {
          const track = searchResult.tracks[0];
          testMsg.edit(`✅ Test 5/5: Recherche Spotify réussie\n\nRésultat: "${track.title}" par ${track.author}\n\nConfiguration testée avec succès!`);
        } else {
          testMsg.edit('❌ Test 5/5: Recherche Spotify a retourné 0 résultats');
        }
      } catch (searchError) {
        testMsg.edit(`❌ Test 5/5: Erreur lors de la recherche Spotify - ${searchError.message}`);
        logger.error('Erreur lors du test de recherche Spotify', searchError);
      }
      
    } catch (error) {
      testMsg.edit(`❌ Erreur lors des tests: ${error.message}`);
      logger.error('Erreur lors des tests de configuration', error);
    }
  }
};
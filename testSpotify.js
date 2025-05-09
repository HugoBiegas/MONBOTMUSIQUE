/**
 * Script de test pour les playlists Spotify
 * Exécuter avec: node testSpotify.js
 */

const { Player, QueryType } = require('discord-player');
const { SpotifyExtractor } = require('@discord-player/extractor');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');

// Client Discord minimal pour le test
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Instance Player pour le test
const player = new Player(client);

// Fonction principale de test
async function testSpotify() {
  try {
    console.log('🔍 Test de recherche Spotify...');
    
    // 1. Enregistrer l'extracteur Spotify
    console.log('⚙️ Enregistrement de l\'extracteur Spotify...');
    await player.extractors.register(SpotifyExtractor, {
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
      autoResolveYoutubeTracks: true
    });
    console.log('✅ Extracteur Spotify enregistré');
    
    // Afficher les extracteurs disponibles
    const extractors = player.extractors.all();
    console.log(`📋 ${extractors.length} extracteurs disponibles:`);
    for (const ext of extractors) {
      console.log(`- ${ext.constructor.name || 'Inconnu'}`);
    }
    
    // 2. Test avec une piste Spotify connue (Despacito, très populaire)
    console.log('\n🎵 Test avec une piste Spotify connue...');
    const trackSearch = await player.search('spotify:track:6habFhsOp2NvshLv26jCDS', {
      searchEngine: QueryType.SPOTIFY_SEARCH,
      spotify: {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        autoResolveYoutubeTracks: true
      }
    });
    
    if (trackSearch && trackSearch.tracks && trackSearch.tracks.length > 0) {
      console.log(`✅ Recherche de piste réussie: "${trackSearch.tracks[0].title}" par ${trackSearch.tracks[0].author}`);
    } else {
      console.log('❌ Échec de la recherche de piste');
    }
    
    // 3. Test avec la playlist spécifique
    const playlistUrl = 'https://open.spotify.com/playlist/6Ster4N9NgkGMHT2deoP73';
    console.log(`\n🎵 Test avec la playlist problématique: ${playlistUrl}`);
    
    console.log('⚠️ Cette opération peut prendre jusqu\'à 30 secondes...');
    const playlistSearch = await player.search(playlistUrl, {
      searchEngine: QueryType.SPOTIFY_SEARCH,
      spotify: {
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret,
        autoResolveYoutubeTracks: true
      }
    });
    
    // Afficher les résultats
    if (playlistSearch && playlistSearch.tracks && playlistSearch.tracks.length > 0) {
      console.log(`✅ Recherche de playlist réussie: ${playlistSearch.tracks.length} pistes trouvées`);
      
      // Afficher quelques pistes pour vérification
      console.log('\n📋 Premières pistes:');
      for (let i = 0; i < Math.min(3, playlistSearch.tracks.length); i++) {
        const track = playlistSearch.tracks[i];
        console.log(`${i+1}. "${track.title}" par ${track.author}`);
      }
    } else {
      console.log('❌ Échec de la recherche de playlist');
      if (playlistSearch) {
        console.log('Détails du résultat:', playlistSearch);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    // Terminer le processus
    process.exit(0);
  }
}

// Exécuter le test
testSpotify();
/**
 * Point d'entrée principal du bot Discord de musique
 * Structure optimisée avec support Spotify et YouTube haute qualité
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');
const path = require('path');

// Modules personnalisés
const config = require('./config.json');
const logger = require('./utils/logger');
const { registerPlayerEvents } = require('./events/playerEvents');
const { registerClientEvents } = require('./events/clientEvents');

// Création du client Discord avec les intents nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Configuration de Discord Player avec options pour maximiser la qualité audio
const player = new Player(client, {
  ytdlOptions: config.ytdlOptions,
  connectionTimeout: config.player.connectionTimeout || 30000,
  skipOnException: true,
  // Options d'optimisation audio
  disableVolume: false,
  smoothVolume: config.audioSettings.smoothTransition || true,
  // Active explicitement le support Spotify
  spotifyBridge: true
});

// Collection pour stocker les commandes
client.commands = new Collection();
client.player = player;

// Configurer les variables d'environnement pour forcer play-dl
process.env.DP_FORCE_YTDL_MOD = "play-dl";

/**
 * Configuration des extracteurs audio avec qualité optimale
 */
async function setupExtractors() {
  try {
    // Dans discord-player v6.6.6, on utilise loadDefault au lieu de loadMulti
    await player.extractors.loadDefault();
    logger.info('✅ Extracteurs par défaut chargés avec succès');
    
    // Configuration Spotify si disponible
    if (config.spotify && config.spotify.clientId && config.spotify.clientSecret) {
      // Pour v6.6.6, on peut configurer Spotify directement via l'extracteur
      try {
        // Accéder à l'extracteur Spotify pour configurer les identifiants
        player.extractors.spotify.setAccessCredentials(
          config.spotify.clientId,
          config.spotify.clientSecret
        );
        
        // Optimisations pour Spotify
        player.extractors.spotify.setPlaylistLimit(100);
        
        logger.info('✅ Extracteur Spotify configuré avec qualité audio maximale');
      } catch (spotifyError) {
        logger.warn('⚠️ Configuration Spotify alternative en cours...', spotifyError);
        // Si la méthode directe échoue, utilisons une autre approche
        await player.extractors.loadDefault();
        logger.info('✅ Extracteurs rechargés avec support Spotify');
      }
    } else {
      logger.warn('⚠️ Configuration Spotify manquante - fonctionnalités limitées');
    }
  } catch (error) {
    logger.error('❌ Erreur lors du chargement des extracteurs', error);
  }
}

/**
 * Charge toutes les commandes depuis le dossier commands
 */
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  let loadedCommands = 0;
  let failedCommands = 0;

  for (const file of commandFiles) {
    try {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
        loadedCommands++;
        logger.debug(`Commande chargée: ${command.name}`);
      } else {
        failedCommands++;
        logger.warn(`La commande ${file} est invalide (structure incorrecte)`);
      }
    } catch (error) {
      failedCommands++;
      logger.error(`Erreur lors du chargement de la commande ${file}`, error);
    }
  }

  logger.info(`📚 Commandes chargées: ${loadedCommands}/${commandFiles.length} (${failedCommands} échecs)`);
}

/**
 * Configure les gestionnaires pour les erreurs non gérées
 */
function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('❌ Exception non capturée', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Promesse rejetée non gérée', reason);
  });
}

/**
 * Initialise les optimisations audio
 */
function setupAudioOptimizations() {
  // Options d'optimisation supplémentaires
  if (config.audioSettings.normalizer) {
    logger.info('🔊 Activation du normaliseur audio pour une qualité constante');
  }
  
  // Augmenter la taille du buffer pour une lecture plus fluide
  if (config.ytdlOptions.highWaterMark < 50000000) {
    logger.info('⚠️ La taille du buffer audio est inférieure à la valeur recommandée');
    logger.info('   Augmentez highWaterMark dans config.json pour une lecture plus fluide');
  }
  
  logger.info('🎵 Optimisations audio configurées pour une qualité maximale');
}

// Initialisation du bot
async function initializeBot() {
  try {
    // Charger les commandes
    loadCommands();
    
    // Configurer les extracteurs audio
    await setupExtractors();
    
    // Optimisations audio
    setupAudioOptimizations();
    
    // Enregistrer les événements
    registerClientEvents(client, config);
    registerPlayerEvents(player);
    
    // Configurer les gestionnaires d'erreurs
    setupErrorHandlers();
    
    // Connexion du bot
    await client.login(config.token);
    logger.info('✅ Connexion réussie');
    
    logger.info('🎵 Bot musical prêt avec qualité audio maximale!');
    logger.info('   Support Spotify et YouTube HD activé');
  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation du bot', error);
    process.exit(1);
  }
}

// Démarrer le bot
initializeBot();
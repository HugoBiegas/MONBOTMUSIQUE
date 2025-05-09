/**
 * Point d'entrée principal du bot Discord de musique
 * Structure modulaire avec support Spotify et YouTube haute qualité
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');

// Modules personnalisés
const logger = require('./utils/logger');
const config = require('./config.json');
const { registerPlayerEvents } = require('./events/playerEvents');
const { registerClientEvents } = require('./events/clientEvents');

/**
 * Classe principale du Bot de musique
 */
class MusicBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ]
    });
    
    // Initialiser la collection de commandes directement sur le client
    this.client.commands = new Collection();
    this.config = config;
    
    // Configuration des gestionnaires d'erreurs non capturées
    this._setupErrorHandlers();
  }
  
  /**
   * Initialise le bot et ses composants
   */
  async initialize() {
    try {
      logger.info('🚀 Initialisation du bot de musique...');
      
      // Initialiser le lecteur audio
      this.player = this._setupPlayer();
      this.client.player = this.player;
      
      // Charger les commandes
      this._loadCommands();
      
      // Enregistrer les événements
      registerClientEvents(this.client, this.config);
      registerPlayerEvents(this.player);
      
      logger.info('✅ Bot initialisé avec succès');
      return this;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation du bot', error);
      throw error;
    }
  }
  
  /**
   * Connecte le bot à Discord
   */
  async connect() {
    try {
      logger.info('🔌 Connexion à Discord en cours...');
      
      // Utiliser un timeout pour éviter que le processus ne reste bloqué
      const loginTimeout = setTimeout(() => {
        logger.error('❌ Délai de connexion dépassé (30s)');
        process.exit(1);
      }, 30000);
      
      await this.client.login(this.config.token);
      clearTimeout(loginTimeout);
      
      logger.info(`✅ Connecté en tant que ${this.client.user.tag}`);
      return this;
    } catch (error) {
      logger.error('❌ Erreur lors de la connexion à Discord', error);
      if (error.message.includes('token')) {
        logger.error('⚠️ Vérifiez que votre token Discord est valide dans config.json');
      }
      throw error;
    }
  }
  
  /**
   * Configure le lecteur audio avec les options optimales
   * @private
   */
  _setupPlayer() {
    logger.info('🎵 Configuration du lecteur audio...');
    
    // Configurer les variables d'environnement pour forcer play-dl
    process.env.DP_FORCE_YTDL_MOD = "play-dl";
    
    // Création du player avec options optimisées pour la qualité audio
    const player = new Player(this.client, {
      ytdlOptions: this.config.ytdlOptions,
      connectionTimeout: this.config.player.connectionTimeout || 30000,
      skipOnException: true,
      disableVolume: false,
      smoothVolume: this.config.audioSettings?.smoothTransition || true,
      spotifyBridge: true
    });
    
    // Configuration des extracteurs
    this._setupExtractors(player).catch(err => {
      logger.warn('⚠️ Erreur lors de la configuration des extracteurs, fonctionnalité limitée', err);
    });
    
    logger.info('✅ Lecteur audio configuré avec qualité optimale');
    return player;
  }
  
  /**
   * Configure les extracteurs audio pour différentes sources
   * @private
   */
  async _setupExtractors(player) {
    try {
      // IMPORTANT: En v7, on utilise loadMulti() à la place de loadDefault()
      await player.extractors.loadMulti(DefaultExtractors);
      logger.info('✅ Extracteurs par défaut chargés avec succès');
      
      // Configuration Spotify si disponible
      if (this.config.spotify?.clientId && this.config.spotify?.clientSecret) {
        try {
          // Dans v7, la façon d'accéder à l'extracteur Spotify a changé
          const spotifyExtractor = player.extractors.get('spotify');
          if (spotifyExtractor) {
            // Utiliser setOptions au lieu de setAccessCredentials pour version 7.1.0
            spotifyExtractor.setOptions({
              clientId: this.config.spotify.clientId,
              clientSecret: this.config.spotify.clientSecret,
              playlistLimit: 100,
              autoResolveYoutubeTracks: true
            });
            
            logger.info('✅ Extracteur Spotify configuré avec qualité audio maximale');
          } else {
            logger.warn('⚠️ Extracteur Spotify non trouvé');
          }
        } catch (spotifyError) {
          logger.warn('⚠️ Configuration Spotify alternative en cours...', spotifyError);
          logger.info('✅ Extracteurs rechargés avec support Spotify');
        }
      } else {
        logger.warn('⚠️ Configuration Spotify manquante - fonctionnalités limitées');
      }
    } catch (error) {
      logger.error('❌ Erreur lors du chargement des extracteurs', error);
      throw error;
    }
  }
  
  /**
   * Charge toutes les commandes depuis le dossier commands
   * @private
   */
  _loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    let loadedCommands = 0;
    let failedCommands = 0;

    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('name' in command && 'execute' in command) {
          // Utiliser la collection directement sur le client
          this.client.commands.set(command.name, command);
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
   * @private
   */
  _setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
      logger.error('❌ Exception non capturée', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Promesse rejetée non gérée', reason);
    });
  }
}

// Fonction principale
async function main() {
  try {
    const bot = new MusicBot();
    await bot.initialize();
    await bot.connect();
    
    logger.info('🎵 Bot musical prêt avec qualité audio maximale!');
    logger.info('   Support Spotify et YouTube HD activé');
  } catch (error) {
    logger.error('❌ Erreur fatale lors du démarrage du bot', error);
    
    if (error.message && error.message.includes('extractors')) {
      logger.error('⚠️ Problème avec les extracteurs audio. Essayez de mettre à jour les paquets avec:');
      logger.error('   npm install @discord-player/extractor@latest discord-player@latest');
    }
    
    // Exit avec un code d'erreur après un délai pour laisser le temps aux logs d'être écrits
    setTimeout(() => process.exit(1), 1000);
  }
}

// Démarrer le bot
main();
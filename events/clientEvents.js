/**
 * Gestionnaire centralisé des événements du client Discord
 * Sépare la logique des événements du fichier principal
 */

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Initialise tous les gestionnaires d'événements pour le client Discord
 * @param {Client} client - Instance du client Discord.js
 * @param {Object} config - Configuration du bot
 */
function registerClientEvents(client, config) {
  // Événement : Bot prêt
  client.once('ready', () => {
    logger.info(`🎵 Bot de musique ${client.user.tag} connecté !`);
    
    // Définir la présence du bot
    client.user.setPresence({
      activities: [{ name: `${config.prefix}help`, type: ActivityType.Listening }],
      status: 'online',
    });
  });

  // Événement : Message reçu
  client.on('messageCreate', async message => {
    // Ignorer les messages des bots et ceux qui ne commencent pas par le préfixe
    if (message.author.bot || !message.content.startsWith(config.prefix)) return;

    // Extraction du nom de commande et des arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Récupération de la commande
    const command = client.commands.get(commandName);
    if (!command) return;

    // Exécution de la commande
    try {
      logger.info(`Commande '${commandName}' exécutée par ${message.author.tag} dans ${message.guild.name}`);
      command.execute(message, args);
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande '${commandName}'`, error);
      message.reply('❌ Une erreur s\'est produite lors de l\'exécution de cette commande !').catch(console.error);
    }
  });

  // Événement : Erreur client
  client.on('error', error => {
    logger.error('Erreur client Discord', error);
  });

  // Événement : Warning client
  client.on('warn', warning => {
    logger.warn('Avertissement client Discord', warning);
  });

  // Événement : Déconnexion
  client.on('shardDisconnect', (event, id) => {
    logger.warn(`Shard ${id} déconnecté (${event.code})`);
  });

  // Événement : Reconnexion
  client.on('shardReconnecting', id => {
    logger.info(`Shard ${id} en cours de reconnexion...`);
  });

  // Événement : Reconnexion réussie
  client.on('shardResume', (id, replayedEvents) => {
    logger.info(`Shard ${id} reconnecté ! ${replayedEvents} événements rejoués.`);
  });

  logger.info('✅ Événements du client Discord enregistrés');
}

module.exports = { registerClientEvents };
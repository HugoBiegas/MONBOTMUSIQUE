/**
 * Gestionnaire centralisé des événements du client Discord
 * Utilise le nouveau système de logging pour une meilleure traçabilité
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

    // Vérifier que client.commands existe
    if (!client.commands) {
      logger.error('La collection de commandes n\'est pas initialisée dans le client');
      return message.reply('❌ Erreur interne: commandes non disponibles').catch(err => {
        logger.error('Impossible d\'envoyer le message d\'erreur', err);
      });
    }

    // Extraction du nom de commande et des arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Récupération de la commande
    const command = client.commands.get(commandName);
    if (!command) return;

    // Exécution de la commande avec contexte du player si nécessaire
    try {
      logger.info(`Commande '${commandName}' exécutée par ${message.author.tag} dans ${message.guild.name}`);
      
      if (client.player && typeof client.player.context?.provide === 'function') {
        // Si disponible, exécuter la commande dans le contexte du player pour un meilleur support des hooks
        await client.player.context.provide({ guild: message.guild }, () => command.execute(message, args));
      } else {
        // Fallback sur l'exécution directe
        await command.execute(message, args);
      }
    } catch (error) {
      logger.error(`Erreur lors de l'exécution de la commande '${commandName}'`, error);
      message.reply('❌ Une erreur s\'est produite lors de l\'exécution de cette commande !').catch(err => {
        logger.error('Erreur lors de l\'envoi du message d\'erreur', err);
      });
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
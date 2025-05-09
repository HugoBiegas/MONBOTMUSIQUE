/**
 * Module de journalisation pour le bot Discord
 * Permet une gestion centralisée des logs avec horodatage et niveaux de sévérité
 */

// Couleurs pour les différents niveaux de log (pour la console)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Niveaux de log avec leurs couleurs associées
const levels = {
  ERROR: { color: colors.red, emoji: '❌' },
  WARN: { color: colors.yellow, emoji: '⚠️' },
  INFO: { color: colors.green, emoji: 'ℹ️' },
  DEBUG: { color: colors.cyan, emoji: '🔍' },
  MUSIC: { color: colors.magenta, emoji: '🎵' }
};

/**
 * Génère un message de log formaté
 * @param {string} level - Niveau de log (ERROR, WARN, INFO, DEBUG, MUSIC)
 * @param {string} message - Message à logger
 * @param {Error|Object} [details] - Détails optionnels (erreur ou objet)
 */
function log(level, message, details = null) {
  if (!levels[level]) level = 'INFO';
  
  const timestamp = new Date().toISOString();
  const { color, emoji } = levels[level];
  
  // Format du message console
  const consoleMessage = `${color}${colors.bright}[${timestamp}] ${level}${colors.reset}${color} ${emoji} ${message}${colors.reset}`;
  
  // Affichage du message
  console.log(consoleMessage);
  
  // Affichage des détails si présents
  if (details) {
    if (details instanceof Error) {
      console.error(`${color}${details.stack || details}${colors.reset}`);
    } else {
      console.log(details);
    }
  }

  // On pourrait également enregistrer les logs dans un fichier si nécessaire
}

// Fonctions d'aide pour chaque niveau de log
module.exports = {
  error: (message, details = null) => log('ERROR', message, details),
  warn: (message, details = null) => log('WARN', message, details),
  info: (message, details = null) => log('INFO', message, details),
  debug: (message, details = null) => log('DEBUG', message, details),
  music: (message, details = null) => log('MUSIC', message, details)
};
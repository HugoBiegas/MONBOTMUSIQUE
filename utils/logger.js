/**
 * Système de logging avancé pour le bot Discord de musique
 * Supporte plusieurs niveaux, fichiers de logs et formatage
 */

const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');

// Créer le dossier de logs s'il n'existe pas
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.error(`Impossible de créer le dossier de logs: ${error.message}`);
  }
}

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

// Niveaux de log avec leurs informations associées
const levels = {
  error: { value: 0, color: colors.red, emoji: '❌', label: 'ERROR' },
  warn: { value: 1, color: colors.yellow, emoji: '⚠️', label: 'WARN' },
  info: { value: 2, color: colors.green, emoji: 'ℹ️', label: 'INFO' },
  debug: { value: 3, color: colors.cyan, emoji: '🔍', label: 'DEBUG' },
  music: { value: 2, color: colors.magenta, emoji: '🎵', label: 'MUSIC' }
};

// Créer un fichier de log pour chaque niveau
const streams = {};
Object.keys(levels).forEach(level => {
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const logFile = path.join(logsDir, `${level}-${today}.log`);
  
  try {
    streams[level] = createWriteStream(logFile, { flags: 'a' });
  } catch (error) {
    console.error(`Erreur lors de la création du fichier de log ${level}: ${error.message}`);
  }
});

/**
 * Génère un message de log formaté
 * @param {string} level - Niveau de log
 * @param {string} message - Message à logger
 * @param {Error|Object} [details] - Détails optionnels (erreur ou objet)
 */
function log(level, message, details = null) {
  if (!levels[level]) level = 'info';
  
  const timestamp = new Date().toISOString();
  const { color, emoji, label } = levels[level];
  
  // Format du message console
  const consoleMessage = `${color}${colors.bright}[${timestamp}] ${label}${colors.reset}${color} ${emoji} ${message}${colors.reset}`;
  
  // Affichage du message dans la console
  console.log(consoleMessage);
  
  // Affichage des détails si présents
  if (details) {
    if (details instanceof Error) {
      console.error(`${color}${details.stack || details}${colors.reset}`);
    } else {
      console.log(details);
    }
  }

  // Écrire dans le fichier de log si disponible
  if (streams[level]) {
    const logEntry = `[${timestamp}] ${label} ${emoji} ${message}`;
    streams[level].write(logEntry + '\n');
    
    if (details) {
      const detailsStr = details instanceof Error 
        ? details.stack || details.toString()
        : JSON.stringify(details, null, 2);
      streams[level].write(detailsStr + '\n');
    }
  }
}

// Créer des fonctions pour chaque niveau de log
const logger = {};
Object.keys(levels).forEach(level => {
  logger[level] = (message, details = null) => log(level, message, details);
});

// Fonction pour fermer tous les streams
logger.close = () => {
  Object.values(streams).forEach(stream => {
    if (stream && typeof stream.end === 'function') {
      stream.end();
    }
  });
};

// Gérer la fermeture propre
process.on('exit', () => {
  logger.close();
});

module.exports = logger;
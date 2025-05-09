# Bot Discord de Musique Haute Qualité

Un bot Discord de musique optimisé pour une qualité audio maximale, supportant YouTube et Spotify avec une expérience utilisateur fluide.

## ✨ Fonctionnalités

- 🎵 Lecture de musique depuis **YouTube** et **Spotify** avec qualité audio optimale
- 🎧 Support des playlists de YouTube et Spotify
- 🔊 Optimisations audio pour une qualité maximale (streaming haute définition)
- 🎚️ Commandes complètes (play, pause, skip, volume, etc.)
- 🔄 Gestion automatique de la file d'attente et transitions fluides
- 🔍 Recherche de musique par mots-clés
- 🌐 Compatible avec les liens directs et les recherches textuelles

## 📋 Prérequis

- [Node.js](https://nodejs.org/) (v16.11.0 ou supérieur)
- [npm](https://www.npmjs.com/)
- Un [token de bot Discord](https://discord.com/developers/applications)
- (Optionnel) [Identifiants Spotify API](https://developer.spotify.com/dashboard/) pour la prise en charge de Spotify

## 🚀 Installation

1. **Clonez ce dépôt**
   ```bash
   git clone https://github.com/votrenom/discord-music-bot.git
   cd discord-music-bot
   ```

2. **Installez les dépendances**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configurez votre fichier config.json**
   ```bash
   cp config.example.json config.json
   ```
   Puis modifiez `config.json` avec votre éditeur préféré pour ajouter votre token Discord et vos identifiants Spotify.

4. **Lancez le bot**
   ```bash
   npm start
   ```

## 💻 Commandes

| Commande | Description |
|----------|-------------|
| `!play <lien/recherche>` | Joue une musique ou une playlist (YouTube/Spotify) |
| `!spotify <lien/recherche>` | Force la recherche sur Spotify |
| `!pause` | Met la musique en pause |
| `!resume` | Reprend la lecture |
| `!skip` | Passe à la chanson suivante |
| `!stop` | Arrête la musique et déconnecte le bot |
| `!queue` | Affiche la file d'attente |
| `!volume <1-100>` | Ajuste le volume |
| `!loop` | Active/désactive la répétition |
| `!help` | Affiche l'aide des commandes |

## 🔧 Résolution des problèmes

Si vous rencontrez des problèmes lors de l'installation, essayez ces solutions :

1. **Problèmes de dépendances**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Problèmes de connexion audio**
   Assurez-vous que les bibliothèques audio sont correctement installées :
   ```bash
   npm install @discordjs/opus ffmpeg-static --legacy-peer-deps
   ```

3. **Erreurs avec Spotify**
   Vérifiez que vos identifiants Spotify dans `config.json` sont valides.

4. **Réinstallation propre**
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

## 🛠️ Technologies utilisées

- [discord.js](https://discord.js.org/) - Bibliothèque Discord
- [discord-player](https://discord-player.js.org/) - Framework de musique
- [@discord-player/extractor](https://github.com/Androz2091/discord-player) - Extracteurs pour différentes sources
- [play-dl](https://github.com/play-dl/play-dl) - Bibliothèque de streaming YouTube optimisée
- [ffmpeg](https://ffmpeg.org/) - Traitement audio

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contributions

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request pour améliorer ce projet.

---

Créé avec ❤️ pour les amateurs de musique sur Discord
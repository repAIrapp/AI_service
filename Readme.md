#  Service IA – Analyse et Réparation d’Objets

Ce service permet d’analyser un objet  à partir d’une **image** ou d’une **description textuelle**, et de fournir automatiquement :

- Un **diagnostic technique** du problème,
- Une **solution de réparation **,
- La **liste des outils nécessaires**,
- Une **sélection de vidéos YouTube** utiles pour réparer l’objet.

---

## Comment ça fonctionne ?

Le service reçoit une requête contenant :
- Une **photo** (ou une description),
- L’**ID de l’utilisateur** et de l’objet,
- Un **token d’authentification JWT**.

Il effectue ensuite :
1. Une **analyse d’image** (via OpenAI Vision) ou **analyse de texte** (via GPT-4 Turbo),
2. Une recherche de **vidéos de réparation** sur YouTube,
3. L’**envoi des résultats** au service DB.
4. Une réponse JSON contenant l’objet détecté, l’analyse, la solution et les vidéos.

---

## Intelligence Artificielle utilisée

Le service utilise les modèles **OpenAI GPT-4 Turbo** et **GPT-4 Vision (gpt-4o)** pour :

- Décrire techniquement l’objet à partir d’une image,
- Diagnostiquer le problème visible,
- Proposer une solution de réparation structurée,
- Extraire un mot-clé utile pour la recherche de tutoriels vidéo.

---

## Envoi des données

Les résultats de l’analyse sont envoyés automatiquement au **service de base de données** via une requête HTTP POST.  
Ils incluent :
- l’ID utilisateur,
- l’ID de l’objet réparé,
- l’analyse (texte ou image),
- la solution IA,
- le chemin vers l’image.

---

## Suivi des métriques

Le service expose des **métriques Prometheus** pour le monitoring :
- Nombre total de requêtes IA,
- Méthode utilisée (POST), route concernée, code retour HTTP.

Ces métriques sont accessibles à l’adresse `/metrics`.

---

## Sécurité

Toutes les requêtes à l’API doivent contenir un **token JWT valide**.  
Le middleware vérifie l’authenticité du token avant d’autoriser l’accès à l’analyse.

---

## API externe utilisée

-  [OpenAI API](https://openai.com/) — pour l’analyse d’image et de texte
-  [YouTube Data API](https://developers.google.com/youtube/v3) — pour récupérer 3 vidéos tutoriels pertinentes





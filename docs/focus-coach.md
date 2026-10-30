# Focus Coach

Branche : `feature/focus-coach`. L’espace est accessible à `/coach` et depuis l’onglet Coach de Tracking. Les routes existantes restent disponibles, y compris `/statistiques` (qui était un écran vide).

Démo hébergée dans un projet Vercel séparé : <https://tracking-focus-coach.vercel.app/coach>. Ce projet contient un instantané de la branche, sans variables Supabase/IA et sans données personnelles. La branche `main` n’a pas été modifiée. Le manifeste de l’espace Coach ouvre `/coach` quand cet espace est installé sur l’écran d’accueil ; revenir à Tracking restaure son manifeste d’origine.

## Ce qui fonctionne immédiatement

- Interface responsive, contrat du jour, critères de preuve et durées estimées.
- Démo locale persistante avec discussion explicitement simulée et boutons de simulation de validation. Aucune IA appelée, aucune clé iPhone délivrée.
- Règles, historique du jour et guide de connexion à Raccourcis/Jomo.
- Serveur Vercel prêt pour Auth, sauvegarde, analyse de preuve texte/image par Claude et lecture sécurisée de l’autorisation.

Le contrat Coach est indépendant des tâches de démonstration de Tracking. Il ne prétend pas importer ni synchroniser les anciens écrans.

## Démarrer localement

Node 22 minimum. `npm ci`, puis deux terminaux :

```sh
npm run dev:api
npm run dev
```

Ouvrir `http://localhost:5173/coach`. Le proxy Vite transmet `/api` au serveur local sur 3001. L’API charge `.env.local` si présent. La démo fonctionne sans fichier d’environnement.

## Activer le mode connecté

1. Choisir un projet Supabase dédié ou un projet existant approprié. Aucun projet de production n’a été modifié par cette branche.
2. Exécuter `supabase/focus-coach-setup.sql` dans le SQL Editor. Ce script crée seulement deux nouvelles tables `focus_coach_*`. RLS est actif et aucun accès `anon`/`authenticated` direct n’est accordé, même en lecture. Le serveur utilise la clé secrète pour ces deux tables.
3. Créer un utilisateur personnel dans Supabase Auth, avec un mot de passe. Éviter l’inscription publique pour cette application personnelle.
4. Configurer les variables de `.env.focus.example` dans `.env.local` ou dans l’environnement Preview du nouveau projet Vercel. Le frontend et le serveur doivent pointer vers le même projet Supabase.
5. `FOCUS_ALLOWED_EMAILS` est obligatoire : adresses autorisées séparées par des virgules. L’autorisation est vérifiée avec `auth.getUser(accessToken)` à chaque action du compte. Ne pas utiliser les métadonnées modifiables de l’utilisateur.
6. Configurer `AI_GATEWAY_MODEL` avec un modèle Claude du catalogue en direct : <https://ai-gateway.vercel.sh/v1/models>. Le modèle de l’exemple a été vérifié lors de l’implémentation. L’API refuse une valeur hors du fournisseur `anthropic/`.
7. Authentification AI Gateway : OIDC du projet Vercel, ou `AI_GATEWAY_API_KEY` côté serveur. Des crédits et les conditions d’activation du fournisseur peuvent être nécessaires. L’abonnement à l’app Claude ne finance pas ces appels.
8. Se connecter depuis l’écran Connexion puis choisir « Ouvrir ma journée connectée ». Les indicateurs de configuration ne sont pas des sondes de disponibilité ; une requête réelle vérifie l’accès.

Ne jamais copier une clé `service_role` ou AI Gateway dans une variable `VITE_*`, dans le code ou dans une conversation. Ne pas stocker les clés dans Git.

## Déployer une preview sans toucher à l’existant

Importer `Louis67810/tracking-app` dans un **nouveau** projet Vercel. Utiliser Node 22 ou 24, Vite, `npm run build`, dossier `dist`, et la branche `feature/focus-coach` pour la preview. `vercel.json` déclare la fonction `/api/coach` et le fallback SPA. Ne pas remplacer le projet ou le domaine d’une autre application. Définir les variables pour Preview, puis redéployer.

La protection de déploiement Vercel peut bloquer Raccourcis avant qu’il atteigne l’API. Choisir un domaine accessible au téléphone. La clé de lecture et l’authentification du compte restent obligatoires côté application.

## Règles serveur

- 1 à 8 priorités ; titre de 3 à 160 caractères ; preuve attendue de 10 à 600 caractères ; durée estimée de 5 à 240 minutes.
- Une seule journée par utilisateur et date serveur, sans modification ni suppression du contrat dans l’API. Les jours précédents restent conservés côté serveur pour l’historique, mais ne donnent aucun accès aujourd’hui.
- Fuseau fixe côté serveur (`Europe/Paris` par défaut). Les changements de fuseau pendant une journée active ne sont pas pris en charge.
- Preuve : une seule tâche ciblée par requête. Une image de 2 Mo maximum (JPG, PNG, WebP), ou un contenu texte d’au moins 80 caractères, doit accompagner la demande. Ce seuil n’atteste pas de la qualité : Claude doit encore examiner le résultat.
- Les images sont envoyées au modèle pour cette requête et ne sont pas stockées dans les tables. L’historique conserve le texte de la demande, la réponse et un indicateur de pièce jointe, pas les octets de l’image. Le fournisseur peut appliquer sa propre politique de rétention.
- Le serveur ne télécharge aucun lien fourni. Un lien seul ne constitue pas une vérification.
- Claude ne dispose d’aucun outil d’écriture : il renvoie une décision structurée. Le serveur vérifie les identifiants, le type de demande et les quotas avant d’enregistrer cette décision.
- 2 exceptions de 15 minutes maximum par jour. Aucun empilement d’exceptions. Une exception n’approuve aucune tâche.
- 40 appels maximum par jour, espacés d’au moins 8 secondes. Une tentative réservée avant un échec IA compte dans le quota pour limiter les coûts. Le budget monétaire doit aussi être configuré dans AI Gateway.
- Mises à jour avec comparaison de version : deux requêtes concurrentes ne peuvent pas enregistrer des décisions basées sur un ancien état. Une collision renvoie 409 ; actualiser la journée avant de continuer.
- Journée terminée quand toutes ses preuves sont approuvées ; permission valable jusqu’au prochain minuit du fuseau configuré, jamais au-delà.
- Pas de déblocage automatique si Auth, DB ou IA est indisponible. Une ancienne autorisation déjà accordée peut rester valable jusqu’à son échéance, notamment si un bloqueur a déjà été arrêté.

Les preuves peuvent être falsifiées et Claude peut se tromper. Le système ne garantit ni la vérité du travail ni un téléphone impossible à contourner. Il ne doit pas servir à contrôler les accès essentiels, la santé ou les secours.

## Contrat de la passerelle

Depuis une session connectée, créer une clé iPhone (aléatoire 256 bits). Le serveur ne conserve que son SHA-256 ; validité 30 jours. Une nouvelle clé remplace l’ancienne. Révoquer la clé si elle a été copiée ailleurs. Retirer une adresse de l’allowlist empêche les actions du compte ; pour retirer aussi une passerelle existante, révoquer sa clé ou supprimer son utilisateur Auth.

La clé est une permission **de lecture**, pas un accès à Claude. Ne pas la mettre dans l’URL : elle doit être dans le corps JSON du POST. Elle est affichée en mémoire de l’interface, une seule fois, et peut être copiée dans Raccourcis. Elle n’est pas persistée dans le navigateur ni les journaux de l’application.

```http
POST /api/coach
Content-Type: application/json

{ "action": "device-status", "token": "CLE_IPHONE" }
```

Réponse :

```json
{
  "allowed": true,
  "reason": "completed",
  "expiresAt": "2026-10-30T23:00:00.000Z",
  "checkedAt": "2026-10-30T19:00:00.000Z",
  "deviceExpiresAt": "2026-11-29T10:00:00.000Z"
}
```

`reason` : `locked`, `no_current_day`, `completed` ou `exception`. Une clé invalide/expirée renvoie 401 et `allowed:false`. Erreur réseau, JSON invalide, erreur HTTP, `allowed` différent du booléen `true`, `expiresAt` expiré ou `checkedAt` ancien (> 60 secondes) : **ne pas lever le blocage**. La réponse porte `Cache-Control: no-store`.

### Avec Jomo (installation et test sur iPhone encore nécessaires)

Documentation officielle : <https://help.jomo.so/en/article/how-to-automate-jomo-with-shortcuts-and-siri-17p3ehp/>

1. Choisir uniquement les applications de divertissement. Créer un modèle de blocage compatible Raccourcis. Éviter un mode strict empêchant aussi l’arrêt légitime de session.
2. Une automatisation quotidienne démarre le blocage. Une autre au changement de journée doit réactiver le modèle après un déblocage de fin de journée ; vérifier son exécution sur le téléphone.
3. Le raccourci « Vérifier mon accès » appelle l’API et valide les champs ci-dessus.
4. `completed` : arrêter la session Jomo jusqu’au prochain jour.
5. `exception` : uniquement si la version installée expose une pause avec reprise automatique, la configurer avec le temps restant avant `expiresAt`, arrondi vers le bas. **Ne jamais remplacer cette pause par un arrêt illimité.** Si la pause temporisée n’est pas disponible, refuser ce déblocage et garder l’autorisation visible dans l’interface seulement.
6. Tester : refus avant validation ; acceptation après validation ; nouveau blocage le lendemain ; reprise après pause ; refus hors réseau et après révocation.

Le site n’exécute pas Raccourcis en arrière-plan. Le raccourci doit être lancé après une décision. Aucune app n’est détectée ni pilotée par cette seule interface. La grille de préparation est une checklist déclarative, pas un état vérifié. Les fonctionnalités et tarifs de Jomo restent à vérifier dans la version installée.

### Sans bloqueur

Une automatisation « quand une application est ouverte » appelle le même endpoint et exécute « Accéder à l’écran d’accueil » en cas de refus/erreur. Elle ne ferme pas l’app, peut afficher brièvement son contenu, et ne détecte pas une expiration si l’app reste ouverte. C’est une friction volontaire, pas un verrou natif.

## Vérification

```sh
npm test
npm run test:ui
npm run build
```

Les tests de politique couvrent les permissions périmées, le passage de minuit/horaire d’hiver, l’approbation d’une seule tâche, les messages d’injection, les preuves insuffisantes, le quota et l’expiration des exceptions. Les tests Postgres exécutent le script dans PGlite et vérifient les permissions, RLS, l’unicité du jour et la comparaison de versions. Les tests navigateur parcourent la démo, vérifient sa persistance, les vues mobile/desktop, l’absence d’autorisation réelle et le retour à Tracking.

Pour les tests navigateur, installer Chromium avec `npx playwright install chromium` puis définir `CHROMIUM_PATH` vers son exécutable, ou utiliser `/usr/bin/chromium` si présent. Aucune requête Claude payante n’est effectuée par ces tests. Les identifiants réels, la sauvegarde Supabase distante et l’exécution de Raccourcis sur iPhone doivent être vérifiés une fois configurés.

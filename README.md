# Voa Casa — Assistant IA Rendu Cuisine

Application web qui transforme un plan de cuisine brut en rendu photoréaliste grâce à GPT-4o Vision + DALL·E 3.

## Structure

```
voa-casa-rendu/
├── index.html   → page principale
├── style.css    → styles
├── app.js       → logique (upload, API, comparateur)
├── favicon.svg  → icône
└── .gitignore
```

## Déploiement

Site statique — aucun serveur requis. Déployable directement sur Vercel en connectant ce dépôt GitHub.

## Utilisation

1. Uploader un plan de cuisine (JPG ou PNG)
2. Décrire optionnellement les améliorations souhaitées
3. Renseigner une clé API OpenAI (`sk-...`)
4. Cliquer sur **Améliorer le rendu**

La clé API est utilisée directement depuis le navigateur du client — elle n'est jamais stockée.

## Coût estimé par rendu

- GPT-4o Vision : ~0,01 €
- DALL·E 3 HD 1792×1024 : ~0,08 €
- **Total : ~0,09 € par image générée**

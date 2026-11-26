# Portfolio – Mathis LABBE

Portfolio de présentation de Mathis LABBE, étudiant en 3ᵉ année de BUT Informatique et développeur C# / .NET en alternance chez 3ma group.

👉 **Voir le site : https://mathislabbe.github.io/**

## Contenu

- **À propos** : parcours, formation, expérience en alternance, qualités personnelles.
- **Projets** : SpoolBox, Sirene, un réseau de neurones codé sans bibliothèque, une application d'échecs et la refonte du site de tennis de table du Haut-Rhin, chacun avec un regard critique (« ce que je ferais autrement »).
- **Compétences**, **Veille** (écosystème .NET) et **Contact**.
- **CV** téléchargeable au format PDF.

## Technique

Site statique en HTML et CSS, sans framework ni JavaScript, pour un chargement rapide. Il est responsive (téléphone, tablette, ordinateur) et respecte les bases de l'accessibilité : lien d'évitement, textes alternatifs, navigation au clavier.

Le CV est écrit en HTML (`cv/cv.html`) et converti en PDF par le script `cv/generer-pdf.ps1`.

## Organisation

| Chemin | Rôle |
| --- | --- |
| `index.html`, `a-propos.html`, `projets.html`, `competences.html`, `veille.html`, `contact.html` | Pages principales |
| `projets/` | Une page par projet |
| `css/style.css` | Mise en forme |
| `images/` | Captures d'écran des projets |
| `cv/` | CV en HTML, en PDF et script de génération |
| `404.html` | Page affichée pour une adresse inconnue |

/* Menu repliable.
   Grand écran : le bouton replie la colonne de menu ; le choix est retenu d'une page à l'autre.
   Téléphone : le menu est fermé par défaut et s'ouvre avec le bouton « Menu ». */
(function () {
  var racine = document.documentElement;
  var bouton = document.querySelector('.bouton-menu');
  if (!bouton) return;

  var libelle = bouton.querySelector('.libelle');
  var grandEcran = window.matchMedia('(min-width: 60rem)');

  function estOuvert() {
    return grandEcran.matches
      ? !racine.classList.contains('menu-replie')
      : racine.classList.contains('menu-ouvert');
  }

  function mettreAJour() {
    var ouvert = estOuvert();
    bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    if (grandEcran.matches) {
      libelle.textContent = ouvert ? 'Replier le menu' : 'Afficher le menu';
    } else {
      libelle.textContent = ouvert ? 'Fermer' : 'Menu';
    }
  }

  bouton.addEventListener('click', function () {
    if (grandEcran.matches) {
      var replie = racine.classList.toggle('menu-replie');
      try { localStorage.setItem('menu-replie', replie ? '1' : '0'); } catch (e) { /* stockage indisponible : tant pis */ }
    } else {
      racine.classList.toggle('menu-ouvert');
    }
    mettreAJour();
  });

  // Échap referme le menu ouvert sur téléphone
  document.addEventListener('keydown', function (evenement) {
    if (evenement.key === 'Escape' && !grandEcran.matches && racine.classList.contains('menu-ouvert')) {
      racine.classList.remove('menu-ouvert');
      mettreAJour();
      bouton.focus();
    }
  });

  if (grandEcran.addEventListener) {
    grandEcran.addEventListener('change', mettreAJour);
  } else {
    grandEcran.addListener(mettreAJour);
  }
  mettreAJour();
})();

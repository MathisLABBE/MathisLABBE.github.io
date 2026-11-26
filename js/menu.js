/* Menu plein écran et apparition des blocs au défilement. */
(function () {
  var racine = document.documentElement;
  var bouton = document.querySelector('.bouton-menu');

  /* ---------- Menu plein écran ---------- */
  if (bouton) {
    var libelle = bouton.querySelector('.libelle');
    var menu = document.getElementById('menu-principal');

    function ouvrir(ouvert) {
      racine.classList.toggle('menu-ouvert', ouvert);
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      libelle.textContent = ouvert ? 'Fermer' : 'Menu';
      if (ouvert && menu) {
        var premier = menu.querySelector('a');
        if (premier) premier.focus();
      }
    }

    bouton.addEventListener('click', function () {
      var ouvert = !racine.classList.contains('menu-ouvert');
      ouvrir(ouvert);
      if (!ouvert) bouton.focus();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && racine.classList.contains('menu-ouvert')) {
        ouvrir(false);
        bouton.focus();
      }
    });

    ouvrir(false);
  }

  /* ---------- Barre du haut : fond plein dès qu'on a défilé ---------- */
  function majDefilement() { racine.classList.toggle('a-defile', window.scrollY > 40); }
  window.addEventListener('scroll', majDefilement, { passive: true });
  majDefilement();

  /* ---------- Apparition des blocs au défilement ---------- */
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mouvementReduit || !('IntersectionObserver' in window)) return;

  var blocs = document.querySelectorAll('main > :not(.heros), main section > *, .ligne-projet, .parcours li');
  if (!blocs.length) return;
  racine.classList.add('animations');

  var observateur = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observateur.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  blocs.forEach(function (bloc) {
    bloc.classList.add('revele');
    observateur.observe(bloc);
  });
})();

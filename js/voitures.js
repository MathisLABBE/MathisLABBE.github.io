/* Accueil : des voitures qui apprennent à conduire (neuroévolution), codé sans bibliothèque.
   Chaque voiture est pilotée par un petit réseau de neurones. Elle ne « voit » que la distance aux bords
   du circuit, mesurée par 5 capteurs. Au départ, les réseaux sont tirés au hasard : les voitures foncent
   dans les murs. À la fin de chaque génération, les meilleures sont gardées et copiées avec de petites
   modifications. Après quelques générations, elles bouclent le circuit. */
(function () {

  /* ==================== Le réseau de neurones ==================== */
  // 5 entrées (les capteurs), 8 neurones cachés, 1 sortie (le volant), activation tanh.
  // La vitesse est la même pour toutes les voitures : seul le pilotage s'apprend.
  var TAILLES = [5, 8, 1];
  var NB_POIDS = 0, INIT = 0.25, FORCE = 0.5;
  for (var t = 0; t < TAILLES.length - 1; t++) NB_POIDS += (TAILLES[t] + 1) * TAILLES[t + 1];

  function cerveauAleatoire() {
    var w = new Float64Array(NB_POIDS);
    // Des poids presque nuls : au départ, les voitures roulent tout droit et ratent le premier virage
    for (var i = 0; i < NB_POIDS; i++) w[i] = (Math.random() * 2 - 1) * INIT;
    return w;
  }

  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function muter(parent, taux, force) {
    var w = new Float64Array(parent);
    for (var i = 0; i < w.length; i++) if (Math.random() < taux) w[i] += gauss() * force;
    return w;
  }

  var tampons = TAILLES.map(function (n) { return new Float64Array(n); });
  function penser(w, entrees) {
    tampons[0].set(entrees);
    var k = 0;
    for (var c = 0; c < TAILLES.length - 1; c++) {
      var nIn = TAILLES[c], nOut = TAILLES[c + 1], avant = tampons[c], apres = tampons[c + 1];
      for (var o = 0; o < nOut; o++) {
        var z = w[k++]; // biais
        for (var j = 0; j < nIn; j++) z += w[k++] * avant[j];
        apres[o] = Math.tanh(z);
      }
    }
    return tampons[TAILLES.length - 1];
  }

  /* ==================== Le circuit ==================== */

  function creerCircuit(cx, cy, rx, ry, demiLargeur) {
    var N = 220, pts = [];
    for (var i = 0; i < N; i++) {
      var a = i / N * Math.PI * 2;
      var r = 1 + 0.2 * Math.sin(2 * a + 0.6) + 0.14 * Math.sin(3 * a + 2.1) + 0.1 * Math.sin(5 * a + 0.3);
      pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
    }
    var longueur = 0;
    for (i = 0; i < N; i++) {
      var p = pts[i], q = pts[(i + 1) % N];
      p.dx = q.x - p.x; p.dy = q.y - p.y;
      p.l2 = p.dx * p.dx + p.dy * p.dy;
      longueur += Math.sqrt(p.l2);
    }
    return { pts: pts, N: N, demi: demiLargeur, longueur: longueur };
  }

  // Distance au centre de la piste, en cherchant autour du dernier segment connu
  function localiser(circuit, x, y, indice) {
    var pts = circuit.pts, N = circuit.N, meilleur = indice, dMin = Infinity;
    for (var k = -4; k <= 8; k++) {
      var i = (indice + k + N) % N, p = pts[i];
      var u = ((x - p.x) * p.dx + (y - p.y) * p.dy) / p.l2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      var ex = p.x + u * p.dx - x, ey = p.y + u * p.dy - y, d = ex * ex + ey * ey;
      if (d < dMin) { dMin = d; meilleur = i; }
    }
    return { indice: meilleur, distance: Math.sqrt(dMin) };
  }

  /* ==================== La simulation ==================== */

  var ANGLES_CAPTEURS = [-1.1, -0.5, 0, 0.5, 1.1];
  var VITESSE = 3.2, BRAQUAGE = 0.05;

  function Simulation(circuit, nbVoitures, echelle) {
    this.circuit = circuit;
    this.nb = nbVoitures;
    this.s = echelle;              // taille du circuit : vitesses et capteurs suivent
    this.portee = 95 * echelle;
    this.generation = 1;
    this.record = 0;               // meilleure progression, en fraction de tour
    this.tourComplet = 0;          // génération du premier tour complet
    this.cerveaux = [];
    for (var i = 0; i < nbVoitures; i++) this.cerveaux.push(cerveauAleatoire());
    this.demarrer();
  }

  Simulation.prototype.demarrer = function () {
    var p0 = this.circuit.pts[0], cap = Math.atan2(p0.dy, p0.dx);
    this.voitures = this.cerveaux.map(function (w) {
      return { w: w, x: p0.x, y: p0.y, cap: cap, v: VITESSE * this.s, indice: 0, tours: 0, progression: 0,
               vivante: true, meilleurePrg: 0, depuisProgres: 0, capteurs: [0, 0, 0, 0, 0] };
    }, this);
    this.temps = 0;
    this.meilleureGen = 0;
  };

  Simulation.prototype.mesurer = function (v) {
    var c = this.circuit, pas = 5 * this.s;
    for (var k = 0; k < ANGLES_CAPTEURS.length; k++) {
      var a = v.cap + ANGLES_CAPTEURS[k], cx = Math.cos(a), cy = Math.sin(a), d = 0, indice = v.indice;
      while (d < this.portee) {
        d += pas;
        var l = localiser(c, v.x + cx * d, v.y + cy * d, indice);
        indice = l.indice;
        if (l.distance > c.demi) break;
      }
      v.capteurs[k] = Math.min(d, this.portee);
    }
  };

  var entrees = new Float64Array(5);
  Simulation.prototype.pas = function () {
    var c = this.circuit, N = c.N, vivantes = 0;
    this.temps++;
    for (var i = 0; i < this.voitures.length; i++) {
      var v = this.voitures[i];
      if (!v.vivante) continue;
      this.mesurer(v);
      for (var k = 0; k < 5; k++) entrees[k] = 1 - v.capteurs[k] / this.portee;
      var sortie = penser(v.w, entrees);
      v.cap += sortie[0] * BRAQUAGE;
      v.x += Math.cos(v.cap) * v.v;
      v.y += Math.sin(v.cap) * v.v;

      var l = localiser(c, v.x, v.y, v.indice);
      if (v.indice > N * 0.8 && l.indice < N * 0.2) v.tours++;
      else if (v.indice < N * 0.2 && l.indice > N * 0.8) v.tours--;
      v.indice = l.indice;
      v.progression = v.tours + v.indice / N;

      if (v.progression > v.meilleurePrg + 0.004) { v.meilleurePrg = v.progression; v.depuisProgres = 0; }
      else v.depuisProgres++;

      if (l.distance > c.demi - 3 * this.s || v.depuisProgres > 140 || v.progression >= 2) v.vivante = false;
      else vivantes++;
      if (v.meilleurePrg > this.meilleureGen) this.meilleureGen = v.meilleurePrg;
    }
    if (this.meilleureGen > this.record) this.record = this.meilleureGen;
    if (this.record >= 1 && !this.tourComplet) this.tourComplet = this.generation;
    return vivantes > 0 && this.temps < 2200;
  };

  // Fin de génération : on garde les 2 meilleures telles quelles, les autres sont des copies modifiées
  Simulation.prototype.evoluer = function () {
    var classees = this.voitures.slice().sort(function (a, b) { return b.meilleurePrg - a.meilleurePrg; });
    var parents = classees.slice(0, Math.max(2, Math.round(this.nb * 0.25)));
    var suivants = [classees[0].w, classees[1].w];
    while (suivants.length < this.nb) {
      var p = parents[Math.floor(Math.pow(Math.random(), 1.6) * parents.length)];
      suivants.push(muter(p.w, 0.2, FORCE));
    }
    // Un peu de hasard pur tant que personne n'a trouvé la bonne direction
    if (this.record < 0.05) for (var i = 2; i < 6 && i < this.nb; i++) suivants[i] = cerveauAleatoire();
    this.cerveaux = suivants;
    this.generation++;
    this.demarrer();
  };

  Simulation.prototype.meneuse = function () {
    var m = null;
    for (var i = 0; i < this.voitures.length; i++) {
      var v = this.voitures[i];
      if (v.vivante && (!m || v.progression > m.progression)) m = v;
    }
    return m;
  };

  window.SimulationVoitures = { Simulation: Simulation, creerCircuit: creerCircuit, reglages: function (v, b, i, f) { VITESSE = v; BRAQUAGE = b; INIT = i; FORCE = f; } };

  /* ==================== L'affichage dans la page ==================== */

  var toile = document.getElementById('circuit');
  if (!toile || !toile.getContext) return;
  var ctx = toile.getContext('2d');
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var infoGen = document.getElementById('voitures-generation');
  var infoRecord = document.getElementById('voitures-record');
  var infoJalon = document.getElementById('voitures-jalon');
  var boutonRelancer = document.getElementById('voitures-relancer');

  var largeur = 0, hauteur = 0, dpr = 1, sim = null, circuit = null, fond = null;

  function dimensionner() {
    var r = toile.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    largeur = r.width; hauteur = r.height;
    toile.width = Math.round(largeur * dpr); toile.height = Math.round(hauteur * dpr);
    var vue = Math.min(hauteur, window.innerHeight), cx, cy, rx, ry;
    if (largeur >= 768) {
      // En haut à droite, au-dessus de la légende, loin du texte
      cx = largeur * 0.66; cy = vue * 0.36;
      rx = Math.min(largeur * 0.24, 460); ry = Math.min(vue * 0.21, 240);
    } else {
      cx = largeur * 0.5; cy = vue * 0.22;
      rx = largeur * 0.3; ry = vue * 0.11;
    }
    var echelle = Math.max(0.55, Math.min(1.3, Math.min(rx, ry) / 260));
    circuit = creerCircuit(cx, cy, rx, ry, 24 * echelle);
    sim = new Simulation(circuit, largeur >= 768 ? 28 : 18, echelle);
    dessinerFond();
    return true;
  }

  // La piste est dessinée une fois dans une image à part
  function dessinerFond() {
    fond = document.createElement('canvas');
    fond.width = toile.width; fond.height = toile.height;
    var f = fond.getContext('2d');
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    var pts = circuit.pts;
    function trace() {
      f.beginPath();
      f.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) f.lineTo(pts[i].x, pts[i].y);
      f.closePath();
    }
    f.lineJoin = 'round';
    trace(); f.strokeStyle = '#3a3a40'; f.lineWidth = circuit.demi * 2 + 3; f.stroke();
    trace(); f.strokeStyle = '#141416'; f.lineWidth = circuit.demi * 2 - 1; f.stroke();
    // ligne de départ
    var p = pts[0], n = Math.sqrt(p.l2), nx = -p.dy / n, ny = p.dx / n;
    f.strokeStyle = '#d4ff3a'; f.lineWidth = 3;
    f.beginPath();
    f.moveTo(p.x + nx * circuit.demi, p.y + ny * circuit.demi);
    f.lineTo(p.x - nx * circuit.demi, p.y - ny * circuit.demi);
    f.stroke();
  }

  function dessinerVoiture(v, couleur, taille) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.cap);
    ctx.fillStyle = couleur;
    ctx.fillRect(-taille, -taille * 0.5, taille * 2, taille);
    ctx.restore();
  }

  function dessiner() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, toile.width, toile.height);
    ctx.drawImage(fond, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var taille = 5 * sim.s;
    var meneuse = sim.meneuse();
    sim.voitures.forEach(function (v) {
      if (v === meneuse) return;
      dessinerVoiture(v, v.vivante ? 'rgba(236, 231, 220, 0.75)' : 'rgba(255, 92, 92, 0.35)', taille);
    });
    if (meneuse) {
      // Ce que « voit » la voiture en tête : ses 5 capteurs
      ctx.strokeStyle = 'rgba(212, 255, 58, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var k = 0; k < ANGLES_CAPTEURS.length; k++) {
        var a = meneuse.cap + ANGLES_CAPTEURS[k], d = meneuse.capteurs[k];
        ctx.moveTo(meneuse.x, meneuse.y);
        ctx.lineTo(meneuse.x + Math.cos(a) * d, meneuse.y + Math.sin(a) * d);
      }
      ctx.stroke();
      ctx.fillStyle = '#d4ff3a';
      for (k = 0; k < ANGLES_CAPTEURS.length; k++) {
        a = meneuse.cap + ANGLES_CAPTEURS[k]; d = meneuse.capteurs[k];
        ctx.beginPath();
        ctx.arc(meneuse.x + Math.cos(a) * d, meneuse.y + Math.sin(a) * d, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      dessinerVoiture(meneuse, '#d4ff3a', taille * 1.2);
    }
  }

  function majTextes() {
    if (infoGen) infoGen.textContent = sim.generation;
    if (infoRecord) infoRecord.textContent = sim.record >= 1 ? 'tour complet' : Math.round(sim.record * 100) + ' %';
    if (infoJalon) infoJalon.textContent = sim.tourComplet ? 'Premier tour complet à la génération ' + sim.tourComplet + '.' : '';
  }

  // Toujours 100 pas de simulation par seconde, quel que soit l'écran : la course garde la même allure
  var PAS_PAR_SECONDE = 100;
  var enCours = false, visible = true, dernier = 0, precedent = 0, reserve = 0;
  function boucle(maintenant) {
    if (!enCours) return;
    if (precedent) reserve += Math.min(maintenant - precedent, 100) * PAS_PAR_SECONDE / 1000;
    precedent = maintenant;
    while (reserve >= 1) {
      reserve -= 1;
      if (!sim.pas()) { sim.evoluer(); reserve = 0; }
    }
    dessiner();
    if (maintenant - dernier > 200) { majTextes(); dernier = maintenant; }
    requestAnimationFrame(boucle);
  }
  function lancer() {
    if (enCours || mouvementReduit || !visible || document.hidden) return;
    enCours = true;
    precedent = 0;
    requestAnimationFrame(boucle);
  }
  function arreter() { enCours = false; }

  // Sans animation : on entraîne d'un coup, puis on montre le meilleur trajet
  function versionFixe() {
    // Budget limité (environ une seconde de calcul) pour ne jamais bloquer la page
    var budget = 12000;
    while (!sim.tourComplet && budget > 0) {
      while (sim.pas() && --budget > 0) { /* génération complète */ }
      sim.evoluer();
    }
    // Rejoue la meilleure voiture et trace son trajet
    var trajet = [], v;
    while (sim.pas()) { v = sim.voitures[0]; if (v.vivante) trajet.push([v.x, v.y]); }
    dessiner();
    ctx.strokeStyle = '#d4ff3a'; ctx.lineWidth = 2;
    ctx.beginPath();
    trajet.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    majTextes();
  }

  function initialiser() {
    if (!dimensionner()) return;
    majTextes();
    if (mouvementReduit) versionFixe(); else { dessiner(); lancer(); }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible) lancer(); else arreter();
    }).observe(toile);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) arreter(); else lancer(); });

  var largeurPrecedente = window.innerWidth, minuteur = null;
  window.addEventListener('resize', function () {
    if (Math.abs(window.innerWidth - largeurPrecedente) < 40) return; // la barre d'adresse du téléphone ne relance rien
    largeurPrecedente = window.innerWidth;
    clearTimeout(minuteur);
    minuteur = setTimeout(function () { arreter(); initialiser(); }, 250);
  });

  if (boutonRelancer) boutonRelancer.addEventListener('click', function () { arreter(); initialiser(); });

  initialiser();
})();

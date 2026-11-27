/* Accueil : des voitures qui apprennent à piloter sur le circuit de Spa-Francorchamps (neuroévolution),
   codé sans bibliothèque.
   Chaque voiture est pilotée par un petit réseau de neurones. Elle ne « voit » que la distance aux bords
   de la piste, mesurée par 5 capteurs, et sa propre vitesse. Elle décide seulement de tourner et
   d'accélérer ou de freiner. Au départ, les réseaux sont presque vides : les voitures filent tout droit
   et ratent La Source. À la fin de chaque génération, les meilleures sont gardées et copiées avec
   de petites modifications. Elles finissent par boucler le tour, puis par le boucler de plus en plus vite. */
(function () {

  /* ==================== Le tracé de Spa-Francorchamps ==================== */
  // Tracé réel (axe de la piste, 7 km), en mètres : x vers l'est, y vers le sud.
  // Source : projet libre « f1-circuits » (github.com/bacinger/f1-circuits), d'après OpenStreetMap.
  var SPA = [384,217,271,20,269,11,274,4,285,0,297,3,334,22,425,65,468,92,514,125,554,159,587,194,760,399,772,411,793,424,830,448,847,464,861,486,870,506,875,528,880,569,883,584,888,597,898,615,984,751,1038,838,1053,870,1063,894,1074,932,1143,1170,1248,1530,1272,1616,1273,1630,1271,1646,1262,1658,1250,1669,1235,1677,1225,1686,1219,1696,1214,1712,1215,1728,1236,1821,1235,1837,1232,1852,1221,1868,1207,1879,968,2043,953,2049,938,2050,922,2045,909,2036,900,2022,896,2009,895,1994,900,1981,908,1966,920,1957,1025,1893,1036,1881,1042,1870,1045,1856,1044,1839,1000,1713,987,1662,956,1503,941,1411,938,1396,930,1379,920,1366,905,1351,888,1340,870,1333,851,1330,788,1325,764,1328,742,1334,720,1344,702,1356,681,1375,668,1394,653,1422,594,1569,541,1700,530,1720,516,1734,498,1744,479,1750,462,1750,445,1747,430,1740,406,1724,390,1717,371,1714,351,1716,334,1722,318,1733,309,1744,297,1761,200,1912,191,1921,179,1927,164,1930,149,1929,135,1923,69,1875,31,1847,21,1835,11,1820,5,1805,1,1788,0,1770,3,1749,10,1730,18,1707,31,1671,54,1631,79,1596,117,1554,180,1493,217,1465,248,1446,410,1362,433,1348,456,1331,476,1311,494,1290,510,1269,532,1229,550,1190,590,1101,597,1081,601,1061,602,1035,598,1011,574,950,548,883,517,799,509,768,501,731,496,696,493,667,484,532,486,523,491,517,500,515,514,517,529,517,539,515,546,508,547,499,543,488,491,404];

  /* ==================== Le réseau de neurones ==================== */
  // 6 entrées (5 capteurs + vitesse), 8 neurones cachés, 3 sorties (volant, accélérateur, frein), activation tanh.
  var TAILLES = [6, 8, 3];
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

  /* ==================== Le circuit à l'écran ==================== */

  // Place le tracé dans un cadre (en pixels), couché sur le côté pour mieux remplir l'écran,
  // puis le redécoupe en petits segments réguliers et adoucit les angles.
  function creerCircuit(cadre, couche) {
    var brut = [], i;
    for (i = 0; i < SPA.length; i += 2) brut.push(couche ? [-SPA[i + 1], SPA[i]] : [SPA[i], SPA[i + 1]]);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    brut.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var echellePx = Math.min(cadre.l / (maxX - minX), cadre.h / (maxY - minY));
    var dx = cadre.x + (cadre.l - (maxX - minX) * echellePx) / 2, dy = cadre.y + (cadre.h - (maxY - minY) * echellePx) / 2;
    brut = brut.map(function (p) { return [dx + (p[0] - minX) * echellePx, dy + (p[1] - minY) * echellePx]; });

    // Redécoupage tous les 4 pixels
    var ecart = 4, res = [brut[0].slice()], reste = 0;
    for (i = 0; i < brut.length; i++) {
      var a = brut[i], b = brut[(i + 1) % brut.length];
      var l = Math.hypot(b[0] - a[0], b[1] - a[1]), d = ecart - reste;
      while (d <= l) { res.push([a[0] + (b[0] - a[0]) * d / l, a[1] + (b[1] - a[1]) * d / l]); d += ecart; }
      reste = l - (d - ecart);
    }
    res.pop();
    // Lissage : trois passes de moyenne avec les voisins
    for (var passe = 0; passe < 3; passe++) {
      res = res.map(function (p, j) {
        var g = res[(j - 1 + res.length) % res.length], h = res[(j + 1) % res.length];
        return [(g[0] + 2 * p[0] + h[0]) / 4, (g[1] + 2 * p[1] + h[1]) / 4];
      });
    }
    var N = res.length, pts = res.map(function (p) { return { x: p[0], y: p[1] }; }), longueur = 0;
    for (i = 0; i < N; i++) {
      var p = pts[i], q = pts[(i + 1) % N];
      p.dx = q.x - p.x; p.dy = q.y - p.y;
      p.l2 = p.dx * p.dx + p.dy * p.dy || 1e-6;
      longueur += Math.sqrt(p.l2);
    }
    return { pts: pts, N: N, longueur: longueur, taille: Math.max(maxX - minX, maxY - minY) * echellePx };
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
  // Réglages : vitesses (en pixels par pas, pour un circuit de 700 px), volant, largeur de piste,
  // durée maximale d'une génération et progrès minimal exigé (sinon la voiture est arrêtée).
  // L'adhérence limite le virage selon la vitesse : pour passer La Source ou le Bus Stop, il faut freiner avant.
  var R = { vmin: 0.8, vmax: 3, accel: 0.035, frein: 0.11, frottement: 0.998, braquage: 0.1, adherence: 0.2,
            demi: 0.017, duree: 3600, progresMin: 0.02, patience: 100 };
  var PAS_PAR_SECONDE = 150;      // à l'écran : 150 pas de simulation par seconde, toujours

  function Simulation(circuit, nbVoitures) {
    this.circuit = circuit;
    this.nb = nbVoitures;
    this.s = circuit.taille / 700;                 // vitesses et capteurs suivent la taille du circuit
    circuit.demi = Math.max(5, circuit.taille * R.demi);
    this.portee = 70 * this.s;
    // Chronomètre à l'échelle du vrai circuit (7 004 m) : la vitesse maximale vaut 340 km/h
    this.secondesParPas = (R.vmax * this.s * 7004 / circuit.longueur) / (340 / 3.6);
    this.stagnation = 0;
    this.generation = 1;
    this.record = 0;               // meilleure progression, en fraction de tour
    this.tourComplet = 0;          // génération du premier tour complet
    this.meilleurTour = 0;         // meilleur temps au tour, en pas de simulation
    this.genMeilleurTour = 0;
    this.cerveaux = [];
    for (var i = 0; i < nbVoitures; i++) this.cerveaux.push(cerveauAleatoire());
    this.demarrer();
  }

  Simulation.prototype.demarrer = function () {
    var p0 = this.circuit.pts[0], cap = Math.atan2(p0.dy, p0.dx), s = this.s;
    this.voitures = this.cerveaux.map(function (w) {
      return { w: w, x: p0.x, y: p0.y, cap: cap, v: 1.2 * s, gaz: 0, frein: 0, indice: 0, tours: 0, toursMax: 0, progression: 0,
               vivante: true, meilleurePrg: 0, repere: 0, depuisProgres: 0, debutTour: 0, fin: 0, score: 0, capteurs: [0, 0, 0, 0, 0] };
    });
    this.temps = 0;
    this.meilleureGen = 0;
  };

  Simulation.prototype.mesurer = function (v) {
    var c = this.circuit, pas = 4 * this.s;
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

  var entrees = new Float64Array(6);
  Simulation.prototype.pas = function () {
    var c = this.circuit, N = c.N, s = this.s, vivantes = 0;
    this.temps++;
    for (var i = 0; i < this.voitures.length; i++) {
      var v = this.voitures[i];
      if (!v.vivante) continue;
      this.mesurer(v);
      for (var k = 0; k < 5; k++) entrees[k] = 1 - v.capteurs[k] / this.portee;
      entrees[5] = v.v / (R.vmax * s);
      var sortie = penser(v.w, entrees);
      // Pédales de 0 à 1, enfoncées seulement si le réseau le décide : au départ, les voitures roulent
      // doucement, apprennent d'abord à tourner, puis à accélérer dans les lignes droites et à freiner avant les virages
      v.gaz = sortie[1] > 0 ? sortie[1] : 0;
      v.frein = sortie[2] > 0 ? sortie[2] : 0;
      v.v = v.v * R.frottement + (v.gaz * R.accel - v.frein * R.frein) * s;
      v.v = Math.max(R.vmin * s, Math.min(R.vmax * s, v.v));
      // Volant : plus on va vite, moins on peut tourner sans perdre l'adhérence
      var virageMax = Math.min(R.braquage, R.adherence * s / v.v);
      v.cap += Math.max(-virageMax, Math.min(virageMax, sortie[0] * R.braquage));
      v.x += Math.cos(v.cap) * v.v;
      v.y += Math.sin(v.cap) * v.v;

      var l = localiser(c, v.x, v.y, v.indice);
      if (v.indice > N * 0.8 && l.indice < N * 0.2) {
        v.tours++;
        // Un tour de plus que jamais : on arrête le chronomètre
        if (v.tours > v.toursMax) {
          v.toursMax = v.tours;
          var chrono = this.temps - v.debutTour;
          if (!this.meilleurTour || chrono < this.meilleurTour) { this.meilleurTour = chrono; this.genMeilleurTour = this.generation; }
          v.debutTour = this.temps;
        }
      } else if (v.indice < N * 0.2 && l.indice > N * 0.8) v.tours--;
      v.indice = l.indice;
      v.progression = v.tours + v.indice / N;

      // Une voiture qui n'avance plus (trop lente, à contresens, qui tourne en rond) est retirée
      if (v.progression > v.repere + R.progresMin) { v.repere = v.progression; v.depuisProgres = 0; }
      else v.depuisProgres++;

      if (l.distance > c.demi || v.depuisProgres > R.patience || v.progression >= 1) { v.vivante = false; v.fin = this.temps; }
      else vivantes++;
      if (v.progression > v.meilleurePrg) v.meilleurePrg = v.progression;
      if (v.meilleurePrg > this.meilleureGen) this.meilleureGen = v.meilleurePrg;
    }
    if (this.meilleureGen > this.record) this.record = this.meilleureGen;
    if (this.record >= 1 && !this.tourComplet) this.tourComplet = this.generation;
    return vivantes > 0 && this.temps < R.duree;
  };

  // Fin de génération (chaque voiture fait au plus un tour, chronométré depuis le départ arrêté) :
  // on classe les voitures (distance parcourue, puis temps au tour),
  // on garde les 2 meilleures telles quelles, les autres sont des copies modifiées des meilleures.
  Simulation.prototype.evoluer = function () {
    var temps = this.temps;
    this.voitures.forEach(function (v) {
      v.score = v.meilleurePrg;
      if (v.progression >= 1) v.score += 1 - (v.fin || temps) / R.duree; // tour bouclé : plus c'est rapide, mieux c'est
    });
    var classees = this.voitures.slice().sort(function (a, b) { return b.score - a.score; });
    var parents = classees.slice(0, Math.max(2, Math.round(this.nb * 0.25)));
    // Bloquées au même virage depuis plusieurs générations : on modifie les copies plus franchement
    var progres = this.record > (this.recordPrecedent || 0) + 0.01 ||
                  (this.meilleurTour && this.meilleurTour < (this.tourPrecedent || Infinity) * 0.99);
    if (progres) this.stagnation = 0; else this.stagnation++;
    this.recordPrecedent = this.record;
    this.tourPrecedent = this.meilleurTour;
    var force = FORCE * (1 + Math.min(3, this.stagnation / 2));
    var suivants = [classees[0].w, classees[1].w];
    while (suivants.length < this.nb) {
      var p = parents[Math.floor(Math.pow(Math.random(), 1.6) * parents.length)];
      suivants.push(muter(p.w, 0.2, force));
    }
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

  window.SimulationVoitures = {
    Simulation: Simulation, creerCircuit: creerCircuit, reglages: R,
    regler: function (o) { for (var k in o) { if (k === 'init') INIT = o[k]; else if (k === 'force') FORCE = o[k]; else R[k] = o[k]; } }
  };

  /* ==================== L'affichage dans la page ==================== */

  var toile = document.getElementById('circuit');
  if (!toile || !toile.getContext) return;
  var ctx = toile.getContext('2d');
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var infoGen = document.getElementById('voitures-generation');
  var infoRecord = document.getElementById('voitures-record');
  var infoTour = document.getElementById('voitures-tour');
  var infoJalon = document.getElementById('voitures-jalon');
  var infoVitesse = document.getElementById('voitures-vitesse');
  var infoPedale = document.getElementById('voitures-pedale');
  var boutonRelancer = document.getElementById('voitures-relancer');
  var boutonRalentir = document.getElementById('voitures-ralentir');
  var boutonAccelerer = document.getElementById('voitures-accelerer');
  var infoMultiplicateur = document.getElementById('voitures-multiplicateur');

  var largeur = 0, hauteur = 0, dpr = 1, sim = null, circuit = null, fond = null;

  function dimensionner() {
    var r = toile.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    largeur = r.width; hauteur = r.height;
    toile.width = Math.round(largeur * dpr); toile.height = Math.round(hauteur * dpr);
    var vue = Math.min(hauteur, window.innerHeight), cadre;
    if (largeur >= 768) {
      // En haut à droite, au-dessus de la légende, loin du texte
      cadre = { x: largeur * 0.47, y: vue * 0.09, l: largeur * 0.49, h: vue * 0.47 };
    } else {
      cadre = { x: largeur * 0.05, y: vue * 0.1, l: largeur * 0.9, h: vue * 0.23 };
    }
    circuit = creerCircuit(cadre, true);
    sim = new Simulation(circuit, largeur >= 768 ? 28 : 24);
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
    trace(); f.strokeStyle = '#4a4a52'; f.lineWidth = circuit.demi * 2 + 3; f.stroke();
    trace(); f.strokeStyle = '#18181b'; f.lineWidth = circuit.demi * 2 - 1; f.stroke();
    // Ligne de départ, juste avant La Source
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
    // Feux stop quand la voiture freine
    if (v.vivante && v.frein > 0.2) {
      ctx.fillStyle = '#ff3b3b';
      var f = Math.max(1.5, taille * 0.45);
      ctx.fillRect(-taille - f * 0.6, -taille * 0.5, f, f);
      ctx.fillRect(-taille - f * 0.6, taille * 0.5 - f, f, f);
    }
    ctx.restore();
  }

  function dessiner() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, toile.width, toile.height);
    ctx.drawImage(fond, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var taille = Math.max(2.5, circuit.demi * 0.45);
    var meneuse = sim.meneuse();
    sim.voitures.forEach(function (v) {
      if (v === meneuse) return;
      dessinerVoiture(v, v.vivante ? 'rgba(236, 231, 220, 0.8)' : 'rgba(255, 92, 92, 0.35)', taille);
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
        ctx.arc(meneuse.x + Math.cos(a) * d, meneuse.y + Math.sin(a) * d, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      dessinerVoiture(meneuse, '#d4ff3a', taille * 1.25);
    }
  }

  // Temps au tour au format course : 1:47,32
  function chrono(pas) {
    var s = pas * sim.secondesParPas, min = Math.floor(s / 60), reste = s - min * 60;
    return min + ':' + (reste < 10 ? '0' : '') + reste.toFixed(2).replace('.', ',');
  }

  function majTextes() {
    if (infoGen) infoGen.textContent = sim.generation;
    if (infoRecord) infoRecord.textContent = sim.record >= 1 ? 'tour complet' : Math.round(sim.record * 100) + ' %';
    if (infoTour) infoTour.textContent = sim.meilleurTour ? chrono(sim.meilleurTour) + ' (génération ' + sim.genMeilleurTour + ')' : '—';
    if (infoJalon) infoJalon.textContent = sim.tourComplet ? 'Premier tour complet à la génération ' + sim.tourComplet + '.' : '';
  }

  // Compteur de la voiture en tête : vitesse ramenée à l'échelle réelle, et la pédale enfoncée
  var dernierePedale = '';
  function majCompteur() {
    var m = sim.meneuse();
    if (infoVitesse) infoVitesse.textContent = m ? Math.round(m.v / (R.vmax * sim.s) * 340) + ' km/h' : '—';
    var pedale = !m ? '' : m.frein > 0.2 ? 'frein' : m.gaz > 0.5 ? 'gaz' : '';
    if (infoPedale && pedale !== dernierePedale) {
      infoPedale.textContent = pedale === 'frein' ? 'Freinage' : pedale === 'gaz' ? 'Accélération' : '';
      infoPedale.className = 'pedale ' + pedale;
      dernierePedale = pedale;
    }
  }

  // Toujours 100 pas de simulation par seconde, quel que soit l'écran : la course garde la même allure
  var enCours = false, visible = true, dernier = 0, precedent = 0, reserve = 0;
  // Vitesse de simulation réglable par le visiteur : le chrono reste en temps de course, il ne change pas
  var VITESSES = [0.25, 0.5, 1, 2, 4, 8], niveau = 2;
  function boucle(maintenant) {
    if (!enCours) return;
    if (precedent) reserve += Math.min(maintenant - precedent, 100) * PAS_PAR_SECONDE * VITESSES[niveau] / 1000;
    precedent = maintenant;
    while (reserve >= 1) {
      reserve -= 1;
      if (!sim.pas()) { sim.evoluer(); reserve = 0; }
    }
    dessiner();
    if (maintenant - dernier > 120) { majTextes(); majCompteur(); dernier = maintenant; }
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
    var budget = 15000;
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

  function majVitesse() {
    var m = VITESSES[niveau];
    if (infoMultiplicateur) infoMultiplicateur.textContent = '×' + String(m).replace('.', ',');
    if (boutonRalentir) boutonRalentir.disabled = niveau === 0;
    if (boutonAccelerer) boutonAccelerer.disabled = niveau === VITESSES.length - 1;
  }
  if (boutonRalentir) boutonRalentir.addEventListener('click', function () { niveau = Math.max(0, niveau - 1); majVitesse(); });
  if (boutonAccelerer) boutonAccelerer.addEventListener('click', function () { niveau = Math.min(VITESSES.length - 1, niveau + 1); majVitesse(); });
  // Sans animation, la simulation ne tourne pas : les boutons n'ont pas d'effet
  if (mouvementReduit && boutonRalentir) boutonRalentir.parentNode.hidden = true;
  majVitesse();

  initialiser();
})();

/* Accueil : un vrai petit réseau de neurones, codé sans bibliothèque, qui apprend en direct
   à séparer deux spirales de points. Le fond de l'écran montre ce qu'il a compris à chaque instant.
   Un clic ajoute un point : le réseau doit s'adapter. */
(function () {
  var toile = document.getElementById('reseau');
  if (!toile || !toile.getContext) return;
  var ctx = toile.getContext('2d');
  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var infoEpoque = document.getElementById('reseau-epoque');
  var infoPerte = document.getElementById('reseau-perte');
  var infoPoints = document.getElementById('reseau-points');
  var boutonRelancer = document.getElementById('reseau-relancer');

  /* ---------- Le réseau : 2 entrées, deux couches cachées de 16 neurones (tanh), 1 sortie (sigmoïde) ---------- */

  var TAILLES = [2, 16, 16, 1];
  var couches = [];
  var epoque = 0;
  var pasAdam = 0;

  function initialiser() {
    couches = [];
    for (var i = 0; i < TAILLES.length - 1; i++) {
      var nIn = TAILLES[i], nOut = TAILLES[i + 1], echelle = Math.sqrt(2 / (nIn + nOut));
      var c = {
        nIn: nIn, nOut: nOut,
        W: new Float64Array(nIn * nOut), b: new Float64Array(nOut),
        gW: new Float64Array(nIn * nOut), gb: new Float64Array(nOut),
        mW: new Float64Array(nIn * nOut), vW: new Float64Array(nIn * nOut),
        mb: new Float64Array(nOut), vb: new Float64Array(nOut),
        a: new Float64Array(nOut), d: new Float64Array(nOut)
      };
      for (var k = 0; k < c.W.length; k++) c.W[k] = (Math.random() * 2 - 1) * echelle * 1.7;
      couches.push(c);
    }
    epoque = 0;
    pasAdam = 0;
  }

  var entree = new Float64Array(2);

  function propager(x, y) {
    entree[0] = x; entree[1] = y;
    var precedent = entree;
    for (var i = 0; i < couches.length; i++) {
      var c = couches[i], derniere = i === couches.length - 1;
      for (var o = 0; o < c.nOut; o++) {
        var z = c.b[o], base = o * c.nIn;
        for (var j = 0; j < c.nIn; j++) z += c.W[base + j] * precedent[j];
        c.a[o] = derniere ? 1 / (1 + Math.exp(-z)) : Math.tanh(z);
      }
      precedent = c.a;
    }
    return precedent[0];
  }

  function etape(points, lr) {
    var i, k, c;
    for (i = 0; i < couches.length; i++) { couches[i].gW.fill(0); couches[i].gb.fill(0); }
    var perte = 0;
    for (var p = 0; p < points.length; p++) {
      var pt = points[p];
      var sortie = propager(pt.x, pt.y);
      var s = Math.min(Math.max(sortie, 1e-7), 1 - 1e-7);
      perte += -(pt.c * Math.log(s) + (1 - pt.c) * Math.log(1 - s));
      // Rétropropagation (entropie croisée + sigmoïde : l'erreur de sortie vaut sortie - cible)
      couches[couches.length - 1].d[0] = sortie - pt.c;
      for (i = couches.length - 1; i >= 0; i--) {
        c = couches[i];
        var prec = i === 0 ? entree : couches[i - 1].a;
        for (var o = 0; o < c.nOut; o++) {
          var d = c.d[o], base = o * c.nIn;
          c.gb[o] += d;
          for (var j = 0; j < c.nIn; j++) c.gW[base + j] += d * prec[j];
        }
        if (i > 0) {
          var cp = couches[i - 1];
          for (var j2 = 0; j2 < c.nIn; j2++) {
            var somme = 0;
            for (var o2 = 0; o2 < c.nOut; o2++) somme += c.W[o2 * c.nIn + j2] * c.d[o2];
            cp.d[j2] = somme * (1 - cp.a[j2] * cp.a[j2]);
          }
        }
      }
    }
    // Mise à jour des poids avec Adam
    pasAdam++;
    var b1 = 0.9, b2 = 0.999, eps = 1e-8, n = points.length;
    var corr1 = 1 - Math.pow(b1, pasAdam), corr2 = 1 - Math.pow(b2, pasAdam);
    for (i = 0; i < couches.length; i++) {
      c = couches[i];
      for (k = 0; k < c.W.length; k++) {
        var g = c.gW[k] / n;
        c.mW[k] = b1 * c.mW[k] + (1 - b1) * g;
        c.vW[k] = b2 * c.vW[k] + (1 - b2) * g * g;
        c.W[k] -= lr * (c.mW[k] / corr1) / (Math.sqrt(c.vW[k] / corr2) + eps);
      }
      for (k = 0; k < c.b.length; k++) {
        var gb = c.gb[k] / n;
        c.mb[k] = b1 * c.mb[k] + (1 - b1) * gb;
        c.vb[k] = b2 * c.vb[k] + (1 - b2) * gb * gb;
        c.b[k] -= lr * (c.mb[k] / corr1) / (Math.sqrt(c.vb[k] / corr2) + eps);
      }
    }
    epoque++;
    return perte / n;
  }

  /* ---------- Les données : deux spirales imbriquées ---------- */

  var points = [];
  function spirales() {
    points = [];
    var n = 80;
    for (var classe = 0; classe < 2; classe++) {
      for (var i = 0; i < n; i++) {
        var r = 0.08 + (i / n) * 0.88;
        var t = (i / n) * 2.6 * Math.PI + classe * Math.PI;
        points.push({
          x: r * Math.cos(t) + (Math.random() - 0.5) * 0.04,
          y: r * Math.sin(t) + (Math.random() - 0.5) * 0.04,
          c: classe
        });
      }
    }
  }

  /* ---------- Dessin ---------- */

  var largeur = 0, hauteur = 0, ratio = 1;
  var centreX = 0, centreY = 0, echelle = 1;
  var grille = document.createElement('canvas');
  var gctx = grille.getContext('2d');
  var PAS = 10; // taille d'une case de la carte de décision, en pixels CSS

  function dimensionner() {
    var r = toile.getBoundingClientRect();
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    largeur = r.width; hauteur = r.height;
    toile.width = Math.round(largeur * ratio);
    toile.height = Math.round(hauteur * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var grand = largeur >= 900;
    // Grand écran : le réseau occupe la droite. Téléphone : il occupe le haut, au-dessus du texte
    var vue = Math.min(hauteur, window.innerHeight);
    centreX = grand ? largeur * 0.72 : largeur * 0.5;
    centreY = grand ? vue * 0.5 : vue * 0.22;
    echelle = grand ? Math.min(largeur * 0.24, vue * 0.4) : Math.min(largeur * 0.42, vue * 0.17);
    grille.width = Math.ceil(largeur / PAS);
    grille.height = Math.ceil(hauteur / PAS);
  }

  function versEcran(x, y) { return [centreX + x * echelle, centreY - y * echelle]; }
  function versDonnees(px, py) { return [(px - centreX) / echelle, (centreY - py) / echelle]; }

  // Couleurs : classe 1 = vert acide, classe 0 = blanc cassé
  var ACIDE = [212, 255, 58], OS = [236, 231, 220], FOND = [11, 11, 12];

  function dessiner() {
    var debut = performance.now();
    var gw = grille.width, gh = grille.height;
    var image = gctx.createImageData(gw, gh), px = image.data;
    for (var gy = 0; gy < gh; gy++) {
      for (var gx = 0; gx < gw; gx++) {
        var d = versDonnees((gx + 0.5) * PAS, (gy + 0.5) * PAS);
        var s = propager(d[0], d[1]);
        var force = Math.abs(s - 0.5) * 2;           // 0 sur la frontière, 1 quand le réseau est sûr de lui
        var coul = s > 0.5 ? ACIDE : OS;
        var alpha = s > 0.5 ? 0.03 + 0.09 * force : 0.02 + 0.05 * force;
        var bord = force < 0.06 ? 0.55 : 0;            // la frontière de décision ressort en trait fin
        var k = (gy * gw + gx) * 4;
        var a = Math.max(alpha, bord);
        px[k] = FOND[0] + (coul[0] - FOND[0]) * a;
        px[k + 1] = FOND[1] + (coul[1] - FOND[1]) * a;
        px[k + 2] = FOND[2] + (coul[2] - FOND[2]) * a;
        px[k + 3] = 255;
      }
    }
    gctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(grille, 0, 0, gw * PAS, gh * PAS);

    for (var i = 0; i < points.length; i++) {
      var p = points[i], e = versEcran(p.x, p.y);
      ctx.beginPath();
      ctx.arc(e[0], e[1], p.ajoute ? 5.5 : 3.5, 0, Math.PI * 2);
      if (p.c === 1) {
        ctx.fillStyle = 'rgb(212,255,58)';
        ctx.fill();
      } else {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgb(236,231,220)';
        ctx.stroke();
      }
    }
    // Sur un appareil lent, on grossit les cases de la carte pour garder une animation fluide
    if (performance.now() - debut > 22 && PAS < 24) {
      PAS += 2;
      grille.width = Math.ceil(largeur / PAS);
      grille.height = Math.ceil(hauteur / PAS);
    }
  }

  var perteActuelle = 0;
  function afficherInfos() {
    if (infoEpoque) infoEpoque.textContent = epoque.toLocaleString('fr-FR');
    if (infoPerte) infoPerte.textContent = perteActuelle.toFixed(3).replace('.', ',');
    if (infoPoints) infoPoints.textContent = points.length;
  }

  /* ---------- Boucle ---------- */

  var visible = true, enCours = false, image = 0;

  function boucle() {
    if (!visible || document.hidden) { enCours = false; return; }
    enCours = true;
    // On ralentit volontairement le début pour qu'on voie le réseau chercher, puis on accélère
    var pas = epoque < 400 ? 1 : epoque < 1200 ? 3 : 6;
    for (var i = 0; i < pas; i++) perteActuelle = etape(points, 0.01);
    dessiner();
    if (++image % 6 === 0) afficherInfos();
    requestAnimationFrame(boucle);
  }

  function relancerBoucle() {
    if (mouvementReduit) { entrainerSansAnimation(); return; }
    if (!enCours) requestAnimationFrame(boucle);
  }

  // Mouvement réduit : on entraîne d'un coup, puis on affiche le résultat final sans animation
  function entrainerSansAnimation() {
    for (var i = 0; i < 2500; i++) perteActuelle = etape(points, 0.01);
    dessiner();
    afficherInfos();
  }

  function demarrer() {
    initialiser();
    perteActuelle = 0;
    dessiner();
    afficherInfos();
    relancerBoucle();
  }

  /* ---------- Interactions ---------- */

  toile.addEventListener('click', function (ev) {
    var r = toile.getBoundingClientRect();
    var d = versDonnees(ev.clientX - r.left, ev.clientY - r.top);
    // Le point ajouté prend la classe que le réseau ne prévoit PAS : il doit corriger sa frontière
    var prevu = propager(d[0], d[1]) > 0.5 ? 1 : 0;
    points.push({ x: d[0], y: d[1], c: 1 - prevu, ajoute: true });
    afficherInfos();
    relancerBoucle();
  });

  if (boutonRelancer) {
    boutonRelancer.addEventListener('click', function () { spirales(); demarrer(); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entrees) {
      visible = entrees[0].isIntersecting;
      if (visible && !mouvementReduit) relancerBoucle();
    }).observe(toile);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !mouvementReduit) relancerBoucle();
  });

  var attente;
  window.addEventListener('resize', function () {
    clearTimeout(attente);
    attente = setTimeout(function () { dimensionner(); dessiner(); }, 120);
  });

  dimensionner();
  spirales();
  demarrer();
})();

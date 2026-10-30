/*
 * Placealgo – runs entirely in the visitor's browser.
 * Faithful JavaScript translation of the Ruby files
 * app/models/place_manualgo.rb, place_manualgo3.rb and place_manualgo4.rb.
 */
(function () {
  "use strict";

  // ---------- The scoring rules (identical in all three Ruby versions) ----------

  function initials1(name, place) {
    return name[0] === place[0] ? 88 : 0;
  }

  function initials2(name, place) {
    if (name.length >= 2 && place.length >= 2 && name.slice(0, 2) === place.slice(0, 2)) return 56;
    return 0;
  }

  function firstLast(name, place) {
    var points = 0;
    if (name.length >= 2 && place.length >= 2) {
      if (name.slice(0, 2) === place.slice(-2)) points += 56;
      if (name.slice(-2) === place.slice(0, 2)) points += 56;
    }
    if (name.length >= 3 && place.length >= 3) {
      if (name.slice(0, 3) === place.slice(-3)) points += 112;
      if (name.slice(-3) === place.slice(0, 3)) points += 112;
    }
    return points;
  }

  function rhymes(name, place) {
    if (name.length >= 2 && place.length >= 2 && name.slice(-2) === place.slice(-2)) return 96;
    return 0;
  }

  function letterGroups(name, place) {
    var points = 0, i;
    if (name.length >= 2 && place.length >= 2) {
      for (i = 0; i <= name.length - 2; i++) {
        if (place.indexOf(name.substr(i, 2)) !== -1) points += 28;
      }
    }
    if (name.length >= 3 && place.length >= 3) {
      for (i = 0; i <= name.length - 3; i++) {
        if (place.indexOf(name.substr(i, 3)) !== -1) { points += 28; break; }
      }
    }
    if (name.length >= 4 && place.length >= 4) {
      for (i = 0; i <= name.length - 4; i++) {
        if (place.indexOf(name.substr(i, 4)) !== -1) { points += 56; break; }
      }
    }
    return points;
  }

  function commonLetters(name, place) {
    var nameChars = name.split(""), placeChars = place.split("");
    var nameShorter = nameChars.length <= placeChars.length;
    var shorter = nameShorter ? nameChars : placeChars;
    var longer = (nameShorter ? placeChars : nameChars).slice();
    var count = 0;
    shorter.forEach(function (letter) {
      var idx = longer.indexOf(letter);
      if (idx !== -1) { count++; longer.splice(idx, 1); }
    });
    var shorterLength = Math.min(nameChars.length, placeChars.length);
    if (shorterLength === 0) return 0;
    var pct = Math.round(count / shorterLength * 100);
    if (pct <= 70) return 0;
    if (pct <= 80) return 28;
    if (pct <= 90) return 56;
    if (pct <= 99) return 88;
    return 128;
  }

  function clean(v) { return String(v == null ? "" : v).trim().toLowerCase(); }
  function pctOf(score, max) { return Math.min(Math.round(score / max * 100), 100); }

  // ---------- Basic compatibility (place_manualgo) ----------

  function calculateBasic(name, place) {
    var n = clean(name), p = clean(place);
    var r = {
      initials1: initials1(n, p),
      initials2: initials2(n, p),
      first_last: firstLast(n, p),
      rhymes: rhymes(n, p),
      letter_groups: letterGroups(n, p),
      common_letters: commonLetters(n, p)
    };
    r.total = r.initials1 + r.initials2 + r.first_last + r.rhymes + r.letter_groups + r.common_letters;
    r.percentage = pctOf(r.total, 300);
    return r;
  }

  // ---------- Full name vs. several places (place_manualgo3 / 4) ----------

  var NAME_TYPES = ["first_name", "middle_name", "last_name", "maiden_name"];
  var PLACE_TYPES = ["country_name", "state_name", "city_name", "suburb_name", "keyword_name"];

  function compareNameToPlace(name, place, nameType, placeType) {
    var r = {
      name_type: nameType, place_type: placeType,
      initials1: initials1(name, place),
      initials2: initials2(name, place),
      first_last: firstLast(name, place),
      rhymes: rhymes(name, place),
      details: []
    };
    r.total = r.initials1 + r.initials2 + r.first_last + r.rhymes;
    if (r.initials1 > 0) r.details.push("Initials (first letter): " + r.initials1 + " points");
    if (r.initials2 > 0) r.details.push("Initials (first two letters): " + r.initials2 + " points");
    if (r.first_last > 0) r.details.push("First-last letter combinations: " + r.first_last + " points");
    if (r.rhymes > 0) r.details.push("Rhyming patterns: " + r.rhymes + " points");
    return r;
  }

  function calculateCompatibility(individual, place) {
    var results = [], total = 0;
    var names = {};
    NAME_TYPES.forEach(function (t) { names[t] = clean(individual[t]); });
    var fullName = NAME_TYPES.map(function (t) { return names[t]; })
      .filter(function (v) { return v !== ""; }).join(" ");
    var fullNameNoSpaces = fullName.replace(/\s+/g, "");

    var places = [];
    PLACE_TYPES.forEach(function (t) {
      var v = clean(place[t]);
      if (v !== "") places.push([t, v]);
    });
    if (places.length === 0) return { total_score: 0, percentage: 0, results: [] };

    NAME_TYPES.forEach(function (t) {
      if (names[t] === "") return;
      places.forEach(function (pl) {
        var s = compareNameToPlace(names[t], pl[1], t, pl[0]);
        if (s.total > 0) { results.push(s); total += s.total; }
      });
    });

    if (fullName !== "") {
      places.forEach(function (pl) {
        var lg = letterGroups(fullNameNoSpaces, pl[1]);
        var cl = commonLetters(fullName, pl[1]);
        var sub = lg + cl;
        if (sub > 0) {
          var r = { name_type: "full_name", place_type: pl[0], letter_groups: lg, common_letters: cl, total: sub, details: [] };
          if (lg > 0) r.details.push("Common letter groups: " + lg + " points");
          if (cl > 0) r.details.push("Common letters: " + cl + " points");
          results.push(r);
          total += sub;
        }
      });
    }

    return { total_score: total, percentage: pctOf(total, 888), results: results };
  }

  function calculateComplete(individual, place, answers) {
    var compat = calculateCompatibility(individual, place);
    var yes = Object.keys(answers).filter(function (k) { return answers[k] === true; }).length;
    var qScore = yes * 50;
    var total = compat.total_score + qScore;
    return {
      total_score: total,
      percentage: pctOf(total, 800 + 888),
      compatibility_score: compat.total_score,
      compatibility_percentage: compat.percentage,
      questionnaire_score: qScore,
      questionnaire_percentage: pctOf(qScore, 800),
      compatibility_results: compat.results,
      questionnaire_results: answers
    };
  }

  // ---------- Helpers for building the result pages ----------

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function titleize(s) {
    return String(s).toLowerCase().replace(/(^|[\s\-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  function humanize(s) {
    var t = String(s).replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function showResults(html) {
    var form = document.getElementById("tool-form");
    var out = document.getElementById("tool-results");
    form.hidden = true;
    out.innerHTML = html;
    out.hidden = false;
    window.scrollTo(0, 0);
  }
  function showAlert(msg) {
    var box = document.getElementById("tool-alert");
    box.textContent = msg;
    box.hidden = false;
    setTimeout(function () { box.hidden = true; }, 4000);
  }

  var NAME_LABELS = { first_name: "First Name", middle_name: "Middle Name", last_name: "Last Name", maiden_name: "Maiden Name", full_name: "Full Name" };
  var PLACE_LABELS = { country_name: "Country", state_name: "State/Province", city_name: "City/Town", suburb_name: "Suburb/Neighborhood", keyword_name: "Other Place" };

  // ---------- Page wiring ----------

  function setupBasic(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = val("name"), place = val("place");
      if (!name.trim() || !place.trim()) { showAlert("Please enter both a name and a place"); return; }
      var r = calculateBasic(name, place);
      showResults(
        '<h1>PlaceAlgo - Name-Place Compatibility Results</h1>' +
        '<div class="card"><div class="card-header"><h3>Compatibility between "' + esc(name) + '" and "' + esc(place) + '"</h3></div>' +
        '<div class="card-body"><div class="results-score"><h2>Overall Compatibility: ' + r.percentage + '%</h2></div>' +
        '<div class="match-details"><h4>Match Details:</h4><ul>' +
        '<li>Initials (first letter): ' + r.initials1 + ' points</li>' +
        '<li>Initials (first two letters): ' + r.initials2 + ' points</li>' +
        '<li>First-last letter combinations: ' + r.first_last + ' points</li>' +
        '<li>Rhyming patterns: ' + r.rhymes + ' points</li>' +
        '<li>Common letter groups: ' + r.letter_groups + ' points</li>' +
        '<li>Common letters: ' + r.common_letters + ' points</li>' +
        '</ul><h4>Total Score: ' + r.total + ' points</h4></div></div></div>' +
        '<p><a href="./" class="btn">Try Another Combination</a></p>'
      );
    });
  }

  function readIndividual() {
    var o = {}; NAME_TYPES.forEach(function (t) { o[t] = val(t); }); return o;
  }
  function readPlace() {
    var o = {}; PLACE_TYPES.forEach(function (t) { o[t] = val(t); }); return o;
  }

  function setupNameOnly(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ind = readIndividual(), pl = readPlace();
      if (!ind.first_name.trim() || !ind.last_name.trim()) { showAlert("First name and last name are required"); return; }
      if (PLACE_TYPES.every(function (t) { return !pl[t].trim(); })) { showAlert("At least one place name must be entered"); return; }
      var r = calculateCompatibility(ind, pl);

      var nameLine = NAME_TYPES.map(function (t) { return ind[t]; }).filter(function (v) { return v.trim(); }).map(esc).join(" ");
      var placeLine = [["country_name", "Country"], ["state_name", "State"], ["city_name", "City"], ["suburb_name", "Suburb"], ["keyword_name", "Other"]]
        .filter(function (p) { return pl[p[0]].trim(); })
        .map(function (p) { return p[1] + ": " + esc(pl[p[0]]); }).join(" ");

      var body = "";
      if (r.results.length) {
        body += '<div class="results-container">';
        NAME_TYPES.concat(["full_name"]).forEach(function (nt) {
          var group = r.results.filter(function (x) { return x.name_type === nt; });
          if (!group.length) return;
          body += '<div class="result-section"><h3>' + NAME_LABELS[nt] + ' Matches</h3>';
          group.forEach(function (x) {
            body += '<div class="result-card"><h4>Match with ' + PLACE_LABELS[x.place_type] + ': ' + esc(pl[x.place_type]) + '</h4><div class="match-details">';
            if (x.details.length) body += '<ul>' + x.details.map(function (d) { return '<li>' + d + '</li>'; }).join("") + '</ul>';
            body += '<p><strong>Subtotal: ' + x.total + ' points</strong></p></div></div>';
          });
          body += '</div>';
        });
        body += '</div>';
      } else {
        body = '<p>No significant matches found. Try different name or place combinations.</p>';
      }

      showResults(
        '<h1>PlaceAlgo - Full Name-Place Compatibility Results</h1>' +
        '<div class="card"><div class="card-header"><h3>Name Analysis Results</h3></div><div class="card-body">' +
        '<div class="results-score"><h2>Overall Compatibility: ' + r.percentage + '%</h2><p>Total Score: ' + r.total_score + ' points</p></div>' +
        '<div class="individual-details"><p><strong>Name:</strong> ' + nameLine + '</p><p><strong>Place Details:</strong> ' + placeLine + '</p></div>' +
        body + '</div></div>' +
        '<p><a href="./" class="btn">Try Another Combination</a></p>'
      );
    });
  }

  var Q_KEYS = ["birthplace", "language", "citizenship", "climate", "topography", "sports_hobbies", "profession", "size",
    "culture", "amenities", "infrastructure", "friends_family", "professional_network", "safety", "affordability", "politics"];
  var Q_LABELS = {
    birthplace: "BIRTHPLACE/UPBRINGING", language: "LANGUAGE", citizenship: "CITIZENSHIP/RESIDENCY", climate: "CLIMATE",
    topography: "LOCATION/TOPOGRAPHY", sports_hobbies: "SPORTS/HOBBIES", profession: "PROFESSION", size: "SIZE",
    culture: "CULTURE", amenities: "AMENITIES", infrastructure: "INFRASTRUCTURE", friends_family: "FRIENDS/FAMILY",
    professional_network: "PROFESSIONAL NETWORK", safety: "SAFETY", affordability: "AFFORDABILITY", politics: "POLITICS"
  };

  function scoreBox(cls, title, score, pct, explanation) {
    return '<div class="score-container ' + cls + '"><h3>' + title + '</h3><div class="score-display">' +
      '<div class="score-number">' + score + '</div>' +
      '<div class="score-bar-container"><div class="score-bar" style="width: ' + pct + '%"></div></div>' +
      '<div class="score-percentage">' + pct + '%</div></div>' +
      (explanation ? '<div class="score-explanation">' + explanation + '</div>' : '') + '</div>';
  }

  function setupComplete(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ind = readIndividual(), pl = readPlace();
      var answers = {};
      Q_KEYS.forEach(function (k) {
        var checked = form.querySelector('input[name="' + k + '"]:checked');
        answers[k] = !!checked && checked.value === "yes";
      });
      var r = calculateComplete(ind, pl, answers);

      var heading = pl.city_name.trim() ? "Results for " + esc(titleize(pl.city_name))
        : pl.country_name.trim() ? "Results for " + esc(titleize(pl.country_name)) : "Compatibility Results";

      var rows = Q_KEYS.map(function (k) {
        return '<tr><td>' + Q_LABELS[k] + '</td><td class="' + (answers[k] ? "yes-answer" : "no-answer") + '">' + (answers[k] ? "Yes" : "No") + '</td></tr>';
      }).join("");

      var details = r.compatibility_results.length ? r.compatibility_results.map(function (x) {
        return '<div class="compatibility-item"><h4>' + humanize(x.name_type) + ' and ' + humanize(x.place_type) +
          ' <span class="points">' + x.total + ' points</span></h4><ul class="detail-list">' +
          x.details.map(function (d) { return '<li>' + d + '</li>'; }).join("") + '</ul></div>';
      }).join("") : '<p class="no-results">No name compatibility matches were found. This could be because there are no significant name-place matches or the place name was not provided.</p>';

      showResults(
        '<div class="results-container"><h1 class="page-title">Your Place Compatibility Results</h1><h2>' + heading + '</h2>' +
        scoreBox("total-score", "Your Total Compatibility Score", r.total_score, r.percentage) +
        '<div class="score-breakdown">' +
        scoreBox("questionnaire-score", "Questionnaire Score", r.questionnaire_score, r.questionnaire_percentage,
          "Based on your 'Yes' answers to the questionnaire (50 points per 'Yes', maximum 800 points)") +
        scoreBox("compatibility-score", "Name-Place Compatibility Score", r.compatibility_score, r.compatibility_percentage,
          "Based on the compatibility between your name and the place name(s)") +
        '</div>' +
        '<div class="section questionnaire-results"><h3>Your Questionnaire Answers</h3><table class="results-table centered-table">' +
        '<thead><tr><th>Category</th><th>Response</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="section compatibility-details"><h3>Name Compatibility Details</h3>' + details + '</div>' +
        '<div class="actions"><a href="./" class="cta-button">Try Another Place</a> <a href="../" class="cta-button">Back to Home</a></div></div>'
      );
    });
  }

  // Expose the calculations (handy for testing) and wire up whichever form is on the page.
  window.Placealgo = { calculateBasic: calculateBasic, calculateCompatibility: calculateCompatibility, calculateComplete: calculateComplete };

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("tool-form");
    if (!form) return;
    var tool = form.getAttribute("data-tool");
    if (tool === "basic") setupBasic(form);
    else if (tool === "name-only") setupNameOnly(form);
    else if (tool === "complete") setupComplete(form);
  });
})();

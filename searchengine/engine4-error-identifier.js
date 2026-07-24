// ================================================================
// ENGINE 4 — Current-Error Identifier
// Compares the raw query against the best candidate found by
// Engines 2/3 and classifies exactly what kind of mistake was made.
// ================================================================

function engine4_identifyError(query, bestMatch) {
  query = String(query || '').toLowerCase();
  bestMatch = String(bestMatch || '').toLowerCase();

  if (!bestMatch || query === bestMatch) {
    return { type: 'none', detail: 'No correction needed.' };
  }

  var lenDiff = bestMatch.length - query.length;

  if (lenDiff === 1) {
    return { type: 'missing_letter', detail: 'You may have left out a letter.' };
  }
  if (lenDiff === -1) {
    return { type: 'extra_letter', detail: 'You may have typed an extra letter.' };
  }
  if (lenDiff === 0) {
    var isTransposition = false;
    for (var i = 0; i < query.length - 1; i++) {
      var arr = query.split('');
      var tmp = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = tmp;
      if (arr.join('') === bestMatch) { isTransposition = true; break; }
    }
    return isTransposition
      ? { type: 'transposed_letters', detail: 'Two letters look swapped.' }
      : { type: 'wrong_letter', detail: 'One or more letters look mistyped.' };
  }
  return { type: 'multiple_errors', detail: 'Several characters differ from the closest match.' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { engine4_identifyError: engine4_identifyError };
}

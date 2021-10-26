/* eslint-disable */

// https://github.com/forrestthewoods/lib_fts/blob/master/code/fts_fuzzy_match.js

const fuzzyMatch = function (pattern: any, str: any) {
  // Score consts
  var adjacencyBonus = 5 // bonus for adjacent matches
  var separatorBonus = 10 // bonus if match occurs after a separator
  var camelBonus = 10 // bonus if match is uppercase and prev is lower
  var leadingLetterPenalty = -3 // penalty applied for every letter in str before the first match
  var maxLeadingLetterPenalty = -9 // maximum penalty for leading letters
  var unmatchedLetterPenalty = -1 // penalty for every letter that doesn't matter

  // Loop variables
  var score = 0
  var patternIdx = 0
  var patternLength = pattern.length
  var strIdx = 0
  var strLength = str.length
  var prevMatched = false
  var prevLower = false
  var prevSeparator = true // true so if first letter match gets separator bonus

  // Use "best" matched letter if multiple string letters match the pattern
  var bestLetter = null
  var bestLower = null
  var bestLetterIdx = null
  var bestLetterScore = 0

  var matchedIndices = []

  // Loop over strings
  while (strIdx !== strLength) {
    var patternChar = patternIdx !== patternLength ? pattern.charAt(patternIdx) : null
    var strChar = str.charAt(strIdx)

    var patternLower = patternChar !== null ? patternChar.toLowerCase() : null
    var strLower = strChar.toLowerCase()
    var strUpper = strChar.toUpperCase()

    var nextMatch = patternChar && patternLower === strLower
    var rematch = bestLetter && bestLower === strLower

    var advanced = nextMatch && bestLetter
    var patternRepeat = bestLetter && patternChar && bestLower === patternLower
    if (advanced || patternRepeat) {
      score += bestLetterScore
      matchedIndices.push(bestLetterIdx)
      bestLetter = null
      bestLower = null
      bestLetterIdx = null
      bestLetterScore = 0
    }

    if (nextMatch || rematch) {
      var newScore = 0

      // Apply penalty for each letter before the first pattern match
      // Note: std::max because penalties are negative values. So max is smallest penalty.
      if (patternIdx === 0) {
        var penalty = Math.max(strIdx * leadingLetterPenalty, maxLeadingLetterPenalty)
        score += penalty
      }

      // Apply bonus for consecutive bonuses
      if (prevMatched) {
        newScore += adjacencyBonus
      }

      // Apply bonus for matches after a separator
      if (prevSeparator) {
        newScore += separatorBonus
      }

      // Apply bonus across camel case boundaries. Includes "clever" isLetter check.
      if (prevLower && strChar === strUpper && strLower !== strUpper) {
        newScore += camelBonus
      }

      // Update patter index IFF the next pattern letter was matched
      if (nextMatch) {
        ++patternIdx
      }

      // Update best letter in str which may be for a "next" letter or a "rematch"
      if (newScore >= bestLetterScore) {
        // Apply penalty for now skipped letter
        if (bestLetter !== null) {
          score += unmatchedLetterPenalty
        }

        bestLetter = strChar
        bestLower = bestLetter.toLowerCase()
        bestLetterIdx = strIdx
        bestLetterScore = newScore
      }

      prevMatched = true
    } else {
      score += unmatchedLetterPenalty
      prevMatched = false
    }

    // Includes "clever" isLetter check.
    prevLower = strChar === strLower && strLower !== strUpper
    prevSeparator = strChar === '_' || strChar === ' '

    ++strIdx
  }

  // Apply score for last match
  if (bestLetter) {
    score += bestLetterScore
    matchedIndices.push(bestLetterIdx)
  }

  var matched = patternIdx === patternLength
  return { matched, score }
}

export default fuzzyMatch

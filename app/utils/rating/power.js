const { POSSIBLE_SUBSTAT_ROLLS, SUBSTAT_WEIGHTING } = require("../../data/artifact-data");
const { findCombos } = require("../find-combinations.js");

const TEST_ARTIFACT = {
  "name": "Viridescent Venerer's Vessel",
  "slot": "goblet",
  "level": "20",
  "mainStat": "Atk%",
  "mainStatAmount": "46.6",
  "substats": [
    {
      "stat": "critRate",
      "amount": "12.8"
    },
    {
      "stat": "critDmg",
      "amount": "14.0"
    },
    {
      "stat": "Def%",
      "amount": "5.8"
    },
    {
      "stat": "Def",
      "amount": "21"
    }
  ]
};

// given an artifact, calculates its power rating -- that is, how strong it is
// compared to the theoretically best artifact with the given substat types.
const ratePower = (artifact) => {
  // pull more detailed information about each substat -- most importantly, how
  // many rolls went into it
  const substats = artifact.substats.map(sub => {
    sub.weight = SUBSTAT_WEIGHTING[sub.stat];
    sub.numRolls = findCombos(POSSIBLE_SUBSTAT_ROLLS[sub.stat], sub.amount);
  });

  console.log(substats);
}

ratePower(TEST_ARTIFACT);

module.exports = ratePower;
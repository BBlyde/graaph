export async function getAllDataByDay(day) {
  /* Calling the Paceman API */
  const res = await fetch(`/api/getAllData/?days=${day}`)
  if (!res.ok) throw new Error('Api error')
  const json = await res.json()
  const apiResponse = json.data

  /* Building the player's data array  */
  let playersData = []
  apiResponse.forEach(run => {
    const nickname = run.nickname.toLowerCase()
    // If it's a new player we create the cell, if not we insert into the corresponding username
    if (playersData[nickname]) {
      playersData[nickname].push(run)
    } else {
      playersData[nickname] = [run]
    }
  })

  /* Building the player's split array */
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  const now = new Date()
  const xDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000 * day)

  let playersSplit = {}
  for (const player in playersData) {
    // Initializing each player into the final array
    playersSplit[player] = []

    // Initializing each split for this player
    splits.forEach(split => {
      playersSplit[player][split] = { run: [] }
    })


    const runs = playersData[player]
    // Pathing into each run of each player
    runs.forEach(run => {
      // Pathing all splits
      splits.forEach(split => {
        // Only adding the split if it was played and if (nether > 2m or player got elytra) and we verify if the run was played within x days
        if (run[split] && (run.nether > 120000 || run.elytra) && run.insertTime >= xDayAgo.toISOString()) {
          playersSplit[player][split]["run"].push(run[split])
        }
      })
    })

    // Pathing threw each split to get additional datas like number of each split played and fastest and avg time of the said split
    splits.forEach(split => {
      const values = playersSplit[player][split].run
      if (values.length > 0) {
        const fastest = Math.min(...values)
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = sum / values.length

        playersSplit[player][split].fastest = fastest
        playersSplit[player][split].avg = avg
        playersSplit[player][split].counter = values.length
      }
    })
  }

  /* Building the two arrays of avg and fastest time for each split and player, will be helpfull later to get leaderboard */
  const leaderboardAvg = []
  const leaderboardFastest = []
  const leaderboardCounter = []
  // Pathing each player
  Object.entries(playersSplit).map(([player, splits]) => {
    // Pathing each split
    Object.entries(splits).map(([split, splitTime]) => {
      // Initializing each object
      if (!leaderboardAvg[split]) {
        leaderboardAvg[split] = []
      }
      // Initializing each object
      if (!leaderboardFastest[split]) {
        leaderboardFastest[split] = []
      }
      // Initializing each object
      if (!leaderboardCounter[split]) {
        leaderboardCounter[split] = []
      }

      // Adding the corresponding time to both fastest/avg array
      Object.entries(splitTime).map(([cat, time]) => {
        if (cat == "avg") {
          leaderboardAvg[split][player] = time
        } else if (cat == "fastest") {
          leaderboardFastest[split][player] = time
        } else if (cat == "counter") {
          leaderboardCounter[split][player] = time
        } 
      })
    })
  })

  /* Building the leaderboard Avg Array */
  const rankedAvg = {}
  for (const [split, player] of Object.entries(leaderboardAvg)) {
    const sorted = Object.entries(player)
      .sort((a, b) => a[1] - b[1])
      .map(([name, time], index) => ({
        name,
        split,
        time,
        position: index + 1
      }))
    rankedAvg[split] = sorted
  }

  /* Building the leaderboard Fastest Array */
  const rankedFastest = {}
  for (const [split, player] of Object.entries(leaderboardFastest)) {
    const sorted = Object.entries(player)
      .sort((a, b) => a[1] - b[1])
      .map(([name, time], index) => ({
        name,
        split,
        time,
        position: index + 1
      }))
    rankedFastest[split] = sorted
  }

  /* Building the leaderboard Fastest Array */
  const rankedCounter = {}
  for (const [split, player] of Object.entries(leaderboardCounter)) {
    const sorted = Object.entries(player)
      .sort((a, b) => b[1] - a[1])
      .map(([name, number], index) => ({
        name,
        split,
        number,
        position: index + 1
      }))
    rankedCounter[split] = sorted
  }
  return [playersSplit, rankedAvg, rankedFastest, rankedCounter]
}

export async function trimAllDataByPlayerId(datas, id) {
  /* Defining player's properties */
  const nickname = id

  const dataPlayer = []
  // Pathing the raw datas
  for (const [player, playerData] of Object.entries(datas[0])) {
    // Only getting the right player's data
    if (player == id) {
      // Accessing each split's data
      for (const [split, splitData] of Object.entries(playerData)) {
        dataPlayer[split] = []  // Defining the final object

        // Pathing the average array to add the leaderboard position into the final object
        for (const [avgSplit, avgData] of Object.entries(datas[1])) {
          // Pathing each player in the average array
          for (const [position, avgArray] of Object.entries(avgData)) {
            // Getting the right player and split
            if (avgArray.name == id && avgArray.split == split) {
              // Adding the leaderboard position to the datas
              splitData["lbAvg"] = avgArray.position
            }
          }
        }

        // Pathing the fastest array to add the leaderboard position into the final object
        for (const [fastestSplit, fastestData] of Object.entries(datas[2])) {
          // Pathing each player in the fastest array
          for (const [position, fastestArray] of Object.entries(fastestData)) {
            // Getting the right player and split
            if (fastestArray.name == id && fastestArray.split == split) {
              // Adding the leaderboard position to the datas
              splitData["lbFastest"] = fastestArray.position
            }
          }
        }

        // Pathing the fastest array to add the leaderboard position into the final object
        for (const [counterSplit, counterData] of Object.entries(datas[3])) {
          // Pathing each player in the fastest array
          for (const [position, counterArray] of Object.entries(counterData)) {
            // Getting the right player and split
            if (counterArray.name == id && counterArray.split == split) {
              // Adding the leaderboard position to the datas
              splitData["lbCounter"] = counterArray.position
              // Adding the datas into the final object
              dataPlayer[split] = splitData
            }
          }
        }
      }
    }
  }

  // Somehow sanitazing the final object because js sucks or im bad idk
  const data = {
    "nether": dataPlayer.nether,
    "bastion": dataPlayer.bastion,
    "fortress": dataPlayer.fortress,
    "stronghold": dataPlayer.stronghold,
    "end": dataPlayer.end,
    "elytra": dataPlayer.elytra,
    "credits": dataPlayer.credits,
  }
  return {
    nickname,
    data
  }
}
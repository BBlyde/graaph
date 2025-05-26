export async function getPlayerById(id) {
  // Calling the Paceman API
  const res = await fetch(`/api/getAllData/?days=1`)
  if (!res.ok) throw new Error('Erreur API')
  const json = await res.json()
  const apiPlayer = json.data

  // Adapting all datas to only get specific player's data
  const runsPlayer = []
  apiPlayer.forEach(run => {
    if (run.nickname.toLowerCase() == id.toLowerCase()) {
      runsPlayer.push(run)
    }
  });

  /* Building player's data with all trimmed datas */
  // General informations
  const nickname = runsPlayer[0].nickname

  // Splits informations stored into a datas object
  const splits = ['nether', 'bastion', 'fortress', 'stronghold', 'end', 'elytra', 'credits']
  let datas = {};
  runsPlayer.forEach(run => {
    for (const key in run) {
      // Verifying each split was played in each run
      if (splits.includes(key)) {
        // Declaring each split for the first time
        if (!datas[key]) {
          datas[key] = [];
        }
        // Pushing the actual value
        datas[key].push(run[key]);
      }
    }
  });

  /* Building each avg value by split */
  const avgNether = Math.round(
    datas.nether.reduce((sum, m) => sum + m, 0) / datas.nether.length
  )

  return {
    nickname,
    datas,
    avgNether
  }
}
export async function getPlayerById(id, day) {
  console.log(day)
  // Calling the Paceman API
  const res = await fetch(`/api/getAllData/?days=${day}`)
  if (!res.ok) throw new Error('Api error')
  const json = await res.json()
  const apiPlayer = json.data
  // console.log(apiPlayer)
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
  const averages = {};
  splits.forEach(key => {
    if (datas[key] && datas[key].length > 0) {
      averages[`avg${key.charAt(0).toUpperCase() + key.slice(1)}`] = Math.round(
        datas[key].reduce((sum, m) => sum + m, 0) / datas[key].length
      );
    }
  });

  /* Building each counter value by split */
  const counters = {};
  splits.forEach(key => {
    if (datas[key] && datas[key].length > 0) {
      counters[`counter${key.charAt(0).toUpperCase() + key.slice(1)}`] = datas[key].length
    }
  });
  // console.log(counters.counterNether)
  
  return {
    nickname,
    datas,
    averages,
    counters
  }
}
export async function getPlayerById(id) {
    // Calling the Paceman API
  const res = await fetch(`/api/getAllData/?days=9`)
  if (!res.ok) throw new Error('Erreur API')
  const json = await res.json()

  // Adapting datas to only get specific player's data
  const apiPlayer = json.data
  const player = []
  apiPlayer.forEach(element => {
    if (element.nickname.toLowerCase() == id.toLowerCase()) {
        player.push(element)
    }
  });
  return player
}
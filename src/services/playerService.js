export async function getPlayerById() {
  const response = await fetch(`/api/getAllData/?days=1`)
  if (!response.ok) {
    throw new Error('API Error')
  }
  console.log(response)
  return await response.json()
}
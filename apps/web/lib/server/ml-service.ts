/** Headers shared by server-side calls to the ML service. */
export function mlServiceHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init)
  const token = process.env.ML_SERVICE_TOKEN
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

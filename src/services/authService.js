import api from "./api.js";

export async function loginWithFirebaseToken(idToken) {
  return api.post("/auth/login", { idToken }).then((res) => res.data);
}

export async function fetchCurrentUser() {
  return api.get("/auth/me").then((res) => res.data);
}

export async function refreshToken() {
  return api.post("/auth/refresh").then((res) => res.data);
}

export function createApi(httpClient) {
  return {
    auth: {
      requestOtp: (email) =>
        httpClient("/api/v1/auth/email/request-otp", {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      verifyOtp: (email, otp) =>
        httpClient("/api/v1/auth/email/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password: otp }),
        }),
      signup: (payload) =>
        httpClient("/api/v1/auth/email/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      verifySignup: (email, otp) =>
        httpClient(`/api/v1/auth/email/verify-signup-otp?otp=${encodeURIComponent(otp)}`, {
          method: "POST",
          body: JSON.stringify({ email }),
        }),
      login: (email, password) =>
        httpClient("/api/v1/auth/email/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
        }),
      me: () => httpClient("/api/v1/auth/me"),
      logout: () => httpClient("/api/v1/auth/logout", { method: "POST" }),
    },
    users: {
      me: () => httpClient("/api/v1/users/me"),
      updateMe: (payload) =>
        httpClient("/api/v1/users/me", {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
    },
    rooms: {
      list: (params) => httpClient(`/api/v1/rooms?${new URLSearchParams(params).toString()}`),
      nearby: (params) =>
        httpClient(`/api/v1/rooms/nearby?${new URLSearchParams(params).toString()}`),
      detail: (roomId) => httpClient(`/api/v1/rooms/${roomId}`),
      myRooms: () => httpClient("/api/v1/rooms/me"),
      create: (payload) =>
        httpClient("/api/v1/rooms/", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      trackView: (roomId) =>
        httpClient(`/api/v1/rooms/${roomId}/view`, {
          method: "POST",
        }),
      expressInterest: (roomId, payload) =>
        httpClient(`/api/v1/rooms/${roomId}/interest`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      update: (roomId, payload) =>
        httpClient(`/api/v1/rooms/${roomId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
      remove: (roomId) =>
        httpClient(`/api/v1/rooms/${roomId}`, {
          method: "DELETE",
        }),

      confirmImage: (roomId, imageUrl, isPrimary) =>
        httpClient(
          `/api/v1/rooms/${roomId}/images/confirm?image_url=${encodeURIComponent(imageUrl)}&is_primary=${isPrimary}`,
          { method: "POST" }
        ),
      listImages: (roomId) => httpClient(`/api/v1/rooms/${roomId}/images`),
      deleteImage: (roomId, imageId) =>
        httpClient(`/api/v1/rooms/${roomId}/images/${imageId}`, {
          method: "DELETE",
        }),
      setPrimaryImage: (roomId, imageId) =>
        httpClient(`/api/v1/rooms/${roomId}/images/${imageId}/primary`, {
          method: "PATCH",
        }),
      reorderImages: (roomId, imageIds) =>
        httpClient(`/api/v1/rooms/${roomId}/images/reorder`, {
          method: "PATCH",
          body: JSON.stringify({ image_ids: imageIds }),
        }),
    },
    interests: {
      sent: () => httpClient("/api/v1/interests/sent"),
      received: () => httpClient("/api/v1/interests/received"),
      updateStatus: (interestId, status) =>
        httpClient(`/api/v1/interests/${interestId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
    },
    admin: {
      pendingRooms: () => httpClient("/api/v1/admin/rooms/pending"),
      updateRoomStatus: (roomId, payload) =>
        httpClient(`/api/v1/admin/rooms/${roomId}/status`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
    },
  };
}

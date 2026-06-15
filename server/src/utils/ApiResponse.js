class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400; // true for 2xx responses
    this.message = message;
    this.data = data;
  }
}

export default ApiResponse;

/*
WHY WE USE THIS:
─────────────────
Without this: Every dev writes responses differently
  res.json({ data: user })
  res.json({ result: user })
  res.json({ user: user })

With this: Consistent structure every time
  res.json(new ApiResponse(200, user, "User fetched"))
  → { statusCode: 200, success: true, message: "User fetched", data: user }

Frontend can always expect: response.data.data
*/
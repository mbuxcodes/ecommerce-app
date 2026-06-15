/*
WITHOUT asyncHandler - every controller needs try/catch:
  const getUser = async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id)
      res.json(user)
    } catch (error) {
      next(error)  // Must manually call next(error)
    }
  }

WITH asyncHandler - clean and automatic:
  const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
    res.json(user)
    // Errors automatically go to error middleware
  })
*/

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error); // Passes error to global error middleware
  }
};

export default asyncHandler;
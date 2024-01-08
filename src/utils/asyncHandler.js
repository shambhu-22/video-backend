const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err));
    }
}

/*const asyncHandler2 = (fn) => {
    return async (req, res, next) => {
        try {
            fn(req, res, next);
        } catch(err) {
            res.status(err.code || 500).json({
                success: false,
                message: "Some asynchandler error occured in function: " + err.message
            })
        }
    };
}*/
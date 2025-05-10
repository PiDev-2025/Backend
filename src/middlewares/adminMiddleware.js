const isAdmin = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'Admin') {
            next();
        } else {
            res.status(403).json({
                message: "Access denied. Admin rights required."
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = { isAdmin };